import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { getSignatureUrl, getLogoUrl } from "../_shared/signature-utils.ts";
import { generateUnifiedCardHTML } from "../_shared/unified-layouts.ts";
import { downloadAndEncodeImageForGotenberg } from "../_shared/image-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  orderId: string;
  only?: 'inside' | 'front' | 'front+inside';
  mode?: 'url' | 'html' | 'debug'; // Added debug mode
  format?: 'preview' | 'production'; // new format option
  origin?: string; // e.g., https://your-app.lovableproject.com
  fullUrl?: string; // direct URL to render
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, only, mode = 'url', format = 'preview', origin, fullUrl } = await req.json() as GenerateRequest;
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GOTENBERG_URL = Deno.env.get('GOTENBERG_URL') || 'https://pdf.sendyourcards.io';
    const GOTENBERG_API_KEY = Deno.env.get('GOTENBERG_API_KEY');

    console.log('Gotenberg URL:', GOTENBERG_URL);
    console.log('API Key configured:', !!GOTENBERG_API_KEY);

    if (!GOTENBERG_URL || !GOTENBERG_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gotenberg URL/API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch order, template, and optional assets
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (orderError || !order) throw new Error(orderError?.message || 'Order not found');

    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', order.template_id)
      .single();
    if (templateError || !template) throw new Error(templateError?.message || 'Template not found');

    // Download logo/signature using shared utilities
    const logoUrl = getLogoUrl(order);
    const signatureUrl = getSignatureUrl(order);
    
    console.log('Order signatures - signature_url:', order.signature_url, 'cropped_signature_url:', order.cropped_signature_url);
    console.log('Selected signature URL:', signatureUrl, 'Selected logo URL:', logoUrl);
    
    const logoDataUrl = logoUrl ? await downloadAndEncodeImageForGotenberg(supabase, logoUrl) || '' : '';
    const signatureDataUrl = signatureUrl ? await downloadAndEncodeImageForGotenberg(supabase, signatureUrl) || '' : '';

    console.log('Encoded data - Logo length:', logoDataUrl?.length || 0, 'Signature length:', signatureDataUrl?.length || 0);

    // Inline template preview image for reliable rendering in Gotenberg
    let previewDataUrl = '';
    try {
      if (template.preview_url) {
        const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
        let fullUrl = template.preview_url;

        if (/^https?:\/\//i.test(fullUrl)) {
          // already absolute
        } else if (fullUrl.startsWith('/lovable-uploads/')) {
          // public asset served by the web app
          if (base) fullUrl = `${base}${fullUrl}`;
        } else if (fullUrl.startsWith('/')) {
          // try Supabase storage public path or fall back to app origin
          const supa = 'https://wsibvneidsmtsazfbmgc.supabase.co';
          fullUrl = `${supa}${fullUrl}`;
        }

        console.log('Fetching preview from:', fullUrl);
        let resp = await fetch(fullUrl);
        if (!resp.ok && base && !/^https?:\/\//i.test(template.preview_url)) {
          // Retry with app origin for any relative URL
          const retryUrl = `${base}${template.preview_url}`;
          console.log('Retrying preview fetch from:', retryUrl);
          resp = await fetch(retryUrl);
        }

        if (resp.ok) {
          const ct = resp.headers.get('content-type') || 'image/png';
          const buf = await resp.arrayBuffer();
          const base64 = encodeBase64(new Uint8Array(buf));
          previewDataUrl = `data:${ct};base64,${base64}`;
          console.log('Preview image fetched and inlined successfully');
        } else {
          console.log('Preview fetch failed with status:', resp.status);
        }
      }
    } catch (e) {
      console.log('Preview image fetch failed:', (e as any)?.message);
    }

    // Build PDF via Gotenberg
    const headers: Record<string, string> = {};
    headers['Authorization'] = `Bearer ${GOTENBERG_API_KEY}`;
    headers['X-Api-Key'] = GOTENBERG_API_KEY;

    const includeFront = (only !== 'inside');
    const includeInside = (only !== 'front');

    let gotenbergResp: Response;

    // Set dimensions based on format
    const paperWidth = format === 'production' ? '10.25' : '5.125';
    const paperHeight = format === 'production' ? '7' : '7';

    if (mode === 'url' && only === 'inside') {
      // Only use URL mode for inside cards to maintain consistency
      // Front cards should use HTML mode to avoid badges and ensure proper positioning
      // Use full order ID instead of shortened version
      const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
      const route = only === 'inside' ? 'inside' : 'front';
      let urlParams = '';
      if (format === 'production') {
        if (route === 'inside') {
          urlParams = '?spread=true&format=production';
        } else {
          urlParams = '?format=production';
        }
      }
      const targetUrl = fullUrl || (base ? `${base}/#/preview/${route}/${orderId}${urlParams}` : '');

      if (!targetUrl) {
        throw new Error('No target URL provided; pass origin or fullUrl');
      }

      console.log('=== GOTENBERG URL MODE DEBUG ===');
      console.log('Target URL being sent to Gotenberg:', targetUrl);
      console.log('Route:', route);
      console.log('Order ID:', orderId);
      console.log('Base origin:', base);
      console.log('Only parameter:', only);
      console.log('Paper dimensions:', paperWidth, 'x', paperHeight);

      const form = new FormData();
      form.append('url', targetUrl);
      form.append('paperWidth', paperWidth);
      form.append('paperHeight', paperHeight);
      form.append('marginTop', '0');
      form.append('marginBottom', '0');
      form.append('marginLeft', '0');
      form.append('marginRight', '0');
      form.append('landscape', 'false');
      form.append('preferCssPageSize', 'true');
      form.append('emulatedMediaType', 'print');
      form.append('waitDelay', '2000ms');

      const gotenbergUrl = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/url`;
      console.log('Gotenberg API endpoint:', gotenbergUrl);
      console.log('Request headers:', Object.keys(headers));
      
      gotenbergResp = await fetch(gotenbergUrl, { method: 'POST', headers, body: form as any });
    } else if (mode === 'debug') {
      // Return the HTML content for debugging
      const frontHTML = buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight);
      // Generate HTML content for inside card using unified layout
      const insideHTML = generateUnifiedCardHTML('inside', {
        message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
        logoDataUrl,
        signatureDataUrl,
        templatePreviewUrl: previewDataUrl,
      }, format, format === 'production');
      
      let debugHTML = '';
      
      if (only === 'front' || !only) {
        debugHTML = frontHTML;
      } else if (only === 'inside') {
        debugHTML = insideHTML;
      }
      
      return new Response(debugHTML, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html' 
        },
      });
    } else {
      // Build HTML and convert (front cards always use HTML, inside can use URL for consistency)
      const form = new FormData();
      
      if (includeFront) {
        // Always generate clean HTML for front cards to avoid badges and ensure proper positioning
        const frontHTML = buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight);
        form.append('files', new Blob([frontHTML], { type: 'text/html' }), 'front.html');
      }
      
      // For inside pages, check if we can use URL mode for consistency with preview
      const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
      let insideHTML = '';
      let useInsideUrl = false;
      
      if (base && includeInside && !includeFront && false) {
        // DISABLED: URL mode for inside-only to avoid Lovable badges and debug elements
        // For inside-only generation, use URL mode to match preview exactly
        const spreadParam = format === 'production' ? '?spread=true' : '';
        const insideUrl = `${base}/#/preview/inside/${orderId}${spreadParam}`;
        
        console.log('Generating inside PDF using preview URL for consistency:', insideUrl);
        
        const insideForm = new FormData();
        insideForm.append('url', insideUrl);
        insideForm.append('paperWidth', paperWidth);
        insideForm.append('paperHeight', paperHeight);
        insideForm.append('marginTop', '0');
        insideForm.append('marginBottom', '0');
        insideForm.append('marginLeft', '0');
        insideForm.append('marginRight', '0');
        insideForm.append('landscape', 'false');
        insideForm.append('preferCssPageSize', 'true');
        insideForm.append('emulatedMediaType', 'print');
        insideForm.append('waitDelay', '2000ms');

        const gotenbergUrl = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/url`;
        gotenbergResp = await fetch(gotenbergUrl, { method: 'POST', headers, body: insideForm as any });
        useInsideUrl = true;
      } else {
        // For combined pages, always generate inside HTML regardless of URL preferences  
        console.log('Combined PDF: Signature data available:', !!signatureDataUrl, 'Logo data available:', !!logoDataUrl);
        insideHTML = generateUnifiedCardHTML('inside', {
          message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
          logoDataUrl,
          signatureDataUrl,
          templatePreviewUrl: previewDataUrl,
        }, format, format === 'production');
      }

      if (includeFront && !includeInside) {
        // Front-only generation always uses HTML mode for clean output
        form.append('files', new File([buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight)], 'index.html', { type: 'text/html' }));
        form.append('paperWidth', paperWidth);
        form.append('paperHeight', paperHeight);
        form.append('marginTop', '0');
        form.append('marginBottom', '0');
        form.append('marginLeft', '0');
        form.append('marginRight', '0');
        form.append('landscape', 'false');
        form.append('preferCssPageSize', 'true');
        
        const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/html`;
        console.log('Calling Gotenberg (html) at:', url, 'includeFront:', includeFront, 'includeInside:', includeInside);
        gotenbergResp = await fetch(url, { method: 'POST', headers, body: form as any });
      } else if (includeInside && !includeFront && useInsideUrl) {
        // This condition will never be true now since useInsideUrl is always false
        console.log('Inside PDF generated using URL mode for consistency with preview');
      } else if (includeInside && !includeFront) {
        // Always use HTML mode for inside-only generation to avoid badges
        console.log('Inside-only PDF: Signature data available:', !!signatureDataUrl, 'Logo data available:', !!logoDataUrl);
        insideHTML = generateUnifiedCardHTML('inside', {
          message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
          logoDataUrl,
          signatureDataUrl,
          templatePreviewUrl: previewDataUrl,
        }, format, format === 'production');
        
        form.append('files', new File([insideHTML], 'index.html', { type: 'text/html' }));
        form.append('paperWidth', paperWidth);
        form.append('paperHeight', paperHeight);
        form.append('marginTop', '0');
        form.append('marginBottom', '0');
        form.append('marginLeft', '0');
        form.append('marginRight', '0');
        form.append('landscape', 'false');
        form.append('preferCssPageSize', 'true');
        
        const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/html`;
        console.log('Calling Gotenberg (html) at:', url, 'includeFront:', includeFront, 'includeInside:', includeInside);  
        gotenbergResp = await fetch(url, { method: 'POST', headers, body: form as any });
      } else {
        // COMBINED PDF: Generate single HTML with identical content as individual PDFs
        console.log('Combined PDF: Single HTML with identical content generation as individual PDFs');
        
        // Generate exact same content as individual PDFs (but don't use the full HTML structure)
        const frontContent = generateUnifiedCardHTML('front', {
          message: '', // Front cards don't have messages
          templatePreviewUrl: previewDataUrl || template.preview_url || '',
        }, format, format === 'production');
        
        console.log('Combined PDF Page 2: Signature data available:', !!signatureDataUrl, 'Logo data available:', !!logoDataUrl);
        const insideContent = generateUnifiedCardHTML('inside', {
          message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
          logoDataUrl,
          signatureDataUrl,
          templatePreviewUrl: previewDataUrl,
        }, format, format === 'production');
        
        // Extract just the body content from each
        const frontBody = frontContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || frontContent;
        const insideBody = insideContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || insideContent;
        
        // Extract styles from each 
        const frontStyles = frontContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)?.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n') || '';
        const insideStyles = insideContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)?.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n') || '';
        
        const combinedHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperWidth}in ${paperHeight}in; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    ${frontStyles}
    ${insideStyles}
  </style>
</head>
<body>
  <div class="page">${frontBody}</div>
  <div class="page">${insideBody}</div>
</body>
</html>`;
        
        form.append('files', new File([combinedHTML], 'index.html', { type: 'text/html' }));
        form.append('paperWidth', paperWidth);
        form.append('paperHeight', paperHeight);
        form.append('marginTop', '0');
        form.append('marginBottom', '0');
        form.append('marginLeft', '0');
        form.append('marginRight', '0');
        form.append('landscape', 'false');
        form.append('preferCssPageSize', 'true');

        const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/html`;
        console.log('Calling Gotenberg (html) single file:', url, 'includeFront:', includeFront, 'includeInside:', includeInside);
        gotenbergResp = await fetch(url, { method: 'POST', headers, body: form as any });
      }
    }

    console.log('Gotenberg response status:', gotenbergResp.status);
    if (!gotenbergResp.ok) {
      const errText = await gotenbergResp.text();
      console.error('Gotenberg error response:', errText);
      throw new Error(`Gotenberg error (${gotenbergResp.status}): ${errText}`);
    }

    const pdfArrayBuffer = await gotenbergResp.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfArrayBuffer);

    const pdfPath = `cards/${orderId}_gotenberg_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: signed } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(pdfPath, 60 * 60); // 1 hour

    // Also provide a permanent public URL (bucket is public)
    const { data: publicData } = supabase.storage
      .from('holiday-cards')
      .getPublicUrl(pdfPath);

    // Persist URL on the order when generating the combined production PDF
    if (format === 'production' && includeFront && includeInside) {
      const { error: updErr } = await supabase
        .from('orders')
        .update({
          production_combined_pdf_path: pdfPath,
          production_combined_pdf_public_url: publicData?.publicUrl || null,
          production_combined_pdf_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      if (updErr) console.log('Failed to store production combined PDF URL:', updErr.message);
    }

    // Include debug info for URL mode
    const debugInfo: any = {};
    if (mode === 'url') {
      const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
      const route = only === 'inside' ? 'inside' : 'front';
      const targetUrl = fullUrl || (base ? `${base}/#/preview/${route}/${orderId}` : '');
      debugInfo.targetUrl = targetUrl;
      debugInfo.gotenbergEndpoint = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/url`;
    }

    return new Response(JSON.stringify({
      success: true,
      pdfPath,
      downloadUrl: signed?.signedUrl || null,
      publicUrl: publicData?.publicUrl || null,
      debug: debugInfo,
      message: (includeFront && includeInside)
        ? 'Gotenberg PDF generated successfully (2 pages: front + inside)'
        : includeFront
          ? 'Gotenberg PDF generated successfully (front only)'
          : 'Gotenberg PDF generated successfully (inside only)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-card-gotenberg error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildFrontHTML(template: any, previewDataUrl: string, format = 'preview', paperWidth = '5.125', paperHeight = '7') {
  const imgSrc = previewDataUrl || template.preview_url || '';
  const isSpread = format === 'production';
  
  return generateUnifiedCardHTML('front', {
    message: '', // Front cards don't have messages
    templatePreviewUrl: imgSrc,
  }, format, isSpread);
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
