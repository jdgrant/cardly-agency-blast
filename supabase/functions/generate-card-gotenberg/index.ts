import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { getSignatureUrl, getLogoUrl } from "../_shared/signature-utils.ts";
import { generateUnifiedCardHTML } from "../_shared/unified-layouts.ts";
import { downloadAndEncodeImageForGotenberg } from "../_shared/image-utils.ts";
import { PDFDocument, degrees } from "https://esm.sh/pdf-lib@^1.17.1";

async function rotatePDFForPCM(pdfBytes: Uint8Array): Promise<Uint8Array> {
  try {
    console.log('🔄 Rotating PDF for PCM DirectMail specifications…');
    
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    // PCM DirectMail requires specific orientations:
    // - Front (page 1): Top faces LEFT = 270° clockwise (or 90° counterclockwise)
    // - Back (page 2): Top faces RIGHT = 90° clockwise
    pages.forEach((page, idx) => {
      const width = page.getWidth();
      const height = page.getHeight();
      
      if (idx === 0) {
        // Page 1 (front): rotate 270° clockwise so top faces left
        console.log(`📄 Rotating page ${idx + 1} (front) 270° clockwise (${width}×${height})`);
        page.setRotation(degrees(270));
      } else {
        // Page 2+ (back/inside): rotate 90° clockwise so top faces right
        console.log(`📄 Rotating page ${idx + 1} (back) 90° clockwise (${width}×${height})`);
        page.setRotation(degrees(90));
      }
    });

    // Save the rotated PDF
    const rotatedPdfBytes = await pdfDoc.save();
    console.log('✅ PDF rotation completed successfully for PCM specifications');
    
    return new Uint8Array(rotatedPdfBytes);
  } catch (error) {
    console.error('❌ PDF rotation failed:', error);
    // Return original PDF if rotation fails
    return pdfBytes;
  }
}

// Convert a data URL (e.g., "data:image/png;base64,AAAA...") to bytes and mime
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string; ext: string } {
  // Be permissive: allow extra params like charset, name, etc. before ;base64
  const match = dataUrl.match(/^data:([^,]+);base64,([\s\S]*)$/);
  if (!match) throw new Error('Invalid data URL');
  const fullMime = match[1];
  const b64 = match[2];
  const mime = fullMime.split(';')[0].trim();
  // atob is available in Deno runtime
  const binary = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  let ext = 'png';
  const lower = mime.toLowerCase();
  if (lower.includes('jpeg') || lower.includes('jpg')) ext = 'jpg';
  else if (lower.includes('webp')) ext = 'webp';
  else if (lower.includes('svg')) ext = 'svg';
  else if (lower.includes('png')) ext = 'png';
  return { bytes, mime, ext };
}

function buildFrontHTML(template: any, previewDataUrl: string, format: 'preview' | 'production' = 'preview', paperWidth = '5.125', paperHeight = '7', brandingLogoDataUrl = '') {
  // CRITICAL: Never use template.preview_url as fallback in production - it creates broken PDFs
  // Only use previewDataUrl which is the base64 encoded version
  const imgSrc = previewDataUrl || '';
  const isSpread = format === 'production';
  
  // For production PDFs, ensure we have a valid image
  if (format === 'production' && !previewDataUrl) {
    throw new Error('Production PDF requires base64 encoded preview image - template image could not be downloaded');
  }
  
  return generateUnifiedCardHTML('front', {
    message: '', // Front cards don't have messages
    templatePreviewUrl: imgSrc,
    brandingLogoDataUrl,
  }, format, isSpread);
}

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
  rotate?: boolean; // Add rotation option - defaults based on orientation
  orientation?: 'portrait' | 'landscape'; // Page orientation for production
  previewOnly?: boolean; // If true, do not lock or persist URLs
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, only, mode = 'url', format = 'preview', origin, fullUrl, rotate, orientation, previewOnly } = await req.json() as GenerateRequest;
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default orientation and rotation
    const pageOrientation = orientation || (format === 'production' ? 'landscape' : 'portrait');
    // Force rotation for portrait requests so the landscape spread renders in portrait view
    const shouldRotate = pageOrientation === 'portrait'
      ? true
      : (typeof rotate === 'boolean' ? rotate : false);

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
    
    // Extract storage path from full URL if needed
    let logoPath = logoUrl;
    if (logoUrl && logoUrl.includes('/storage/v1/object/public/holiday-cards/')) {
      logoPath = logoUrl.split('/storage/v1/object/public/holiday-cards/')[1];
    }
    
    let signaturePath = signatureUrl;
    if (signatureUrl && signatureUrl.includes('/storage/v1/object/public/holiday-cards/')) {
      signaturePath = signatureUrl.split('/storage/v1/object/public/holiday-cards/')[1];
    }
    
    console.log('Extracted paths - Logo:', logoPath, 'Signature:', signaturePath);
    
    let logoDataUrl = '';
    let signatureDataUrl = '';
    
    try {
      logoDataUrl = logoPath ? await downloadAndEncodeImageForGotenberg(supabase, logoPath) || '' : '';
      console.log('Logo download result - length:', logoDataUrl?.length || 0);
    } catch (error) {
      console.error('Error downloading logo:', error);
    }
    
    try {
      signatureDataUrl = signaturePath ? await downloadAndEncodeImageForGotenberg(supabase, signaturePath) || '' : '';
      console.log('Signature download result - length:', signatureDataUrl?.length || 0);
    } catch (error) {
      console.error('Error downloading signature:', error);
    }

    console.log('Final encoded data - Logo length:', logoDataUrl?.length || 0, 'Signature length:', signatureDataUrl?.length || 0);

    // Download and encode branding logo from SendYourCards.io
    let brandingLogoDataUrl = '';
    try {
      const brandingLogoUrl = 'https://sendyourcards.io/lovable-uploads/adb3c39b-2bc1-4fb1-b219-92f9510584c9.png';
      
      console.log('Fetching SendYourCards.io logo from:', brandingLogoUrl);
      const brandingLogoResponse = await fetch(brandingLogoUrl);
      if (brandingLogoResponse.ok) {
        const brandingLogoBuffer = await brandingLogoResponse.arrayBuffer();
        const brandingLogoBase64 = encodeBase64(new Uint8Array(brandingLogoBuffer));
        brandingLogoDataUrl = `data:image/png;base64,${brandingLogoBase64}`;
        console.log('✅ SendYourCards.io logo SUCCESS - length:', brandingLogoDataUrl?.length || 0);
      } else {
        console.log('❌ Failed to fetch SendYourCards.io logo, status:', brandingLogoResponse.status);
      }
    } catch (error) {
      console.error('❌ Error downloading SendYourCards.io logo:', error);
    }

    // CRITICAL: Inline template preview image for reliable rendering in Gotenberg
    // This prevents broken images in PCM production PDFs
    const includeFront = (only !== 'inside');
    const includeInside = (only !== 'front');
    const isProductionPDF = format === 'production' && includeFront && includeInside;

    // Determine final rotation: default to true for combined production PDFs unless explicitly disabled
    const finalShouldRotate = (typeof rotate === 'boolean') ? rotate : false;

    let previewDataUrl = '';
    try {
      if (template.preview_url) {
        // First, try to download directly from Supabase storage if this is a public storage URL
        let loadedFromStorage = false;
        const storageMatch = template.preview_url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
        if (storageMatch) {
          const bucket = storageMatch[1];
          const path = storageMatch[2];
          console.log('Attempting storage download for preview:', bucket, path);
          const { data: fileData, error: fileErr } = await supabase.storage.from(bucket).download(path);
          if (!fileErr && fileData) {
            const buf = await fileData.arrayBuffer();
            // best-effort content type from extension
            const ext = path.split('.').pop()?.toLowerCase() || 'png';
            const ct = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
            const base64 = encodeBase64(new Uint8Array(buf));
            previewDataUrl = `data:${ct};base64,${base64}`;
            loadedFromStorage = true;
            console.log('✅ Preview loaded from storage and encoded - size:', base64.length);
          } else {
            console.log('Storage download failed, will try HTTP fetch:', fileErr?.message);
          }
        }

        if (!loadedFromStorage) {
          const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
          let fullUrl = template.preview_url;

          if (!/^https?:\/\//i.test(fullUrl)) {
            if (fullUrl.startsWith('/lovable-uploads/')) {
              // Try both the request origin and hardcoded fallback for lovable-uploads
              if (base) {
                fullUrl = `${base}${fullUrl}`;
              } else {
                // Fallback to the project domain for uploaded assets  
                fullUrl = `https://e84fd20e-7cca-4259-84ad-12452c25e301.lovableproject.com${fullUrl}`;
              }
            } else if (fullUrl.startsWith('/')) {
              const supa = 'https://wsibvneidsmtsazfbmgc.supabase.co';
              fullUrl = `${supa}${fullUrl}`;
            } else if (base) {
              fullUrl = `${base}/${fullUrl.replace(/^\.?\//,'')}`;
            }
          }

          console.log('🖼️ Fetching preview over HTTP from:', fullUrl);
          console.log('Template preview_url:', template.preview_url, 'Base origin:', base);
          
          let resp = await fetch(fullUrl);
          if (!resp.ok && base && !/^https?:\/\//i.test(template.preview_url)) {
            const retryUrl = `${base}${template.preview_url}`;
            console.log('🔄 Retrying preview fetch from:', retryUrl);
            resp = await fetch(retryUrl);
          }
          
          // Additional fallback for lovable-uploads paths
          if (!resp.ok && template.preview_url.startsWith('/lovable-uploads/')) {
            const fallbackUrl = `https://e84fd20e-7cca-4259-84ad-12452c25e301.lovableproject.com${template.preview_url}`;
            console.log('🔄 Fallback preview fetch from:', fallbackUrl);
            resp = await fetch(fallbackUrl);
          }

          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let ct = resp.headers.get('content-type') || '';
            const extFromUrl = (fullUrl.split('.').pop()?.toLowerCase() || '');
            const sniffMime = (b: Uint8Array): string => {
              if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
              if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
              if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
              return '';
            };
            const sniffed = sniffMime(bytes);
            if (!ct.toLowerCase().startsWith('image/')) {
              // Use sniffed type, else infer from URL, else default to png
              ct = sniffed || (extFromUrl === 'jpg' || extFromUrl === 'jpeg' ? 'image/jpeg' : extFromUrl === 'webp' ? 'image/webp' : extFromUrl === 'svg' ? 'image/svg+xml' : 'image/png');
            } else {
              // Strip params like charset
              ct = ct.split(';')[0].trim();
            }
            const base64 = encodeBase64(bytes);
            previewDataUrl = `data:${ct};base64,${base64}`;
            console.log('✅ Preview image fetched and encoded successfully - size:', base64.length, 'mime:', ct);
          } else {
            const errorMsg = `❌ Preview fetch failed with status: ${resp.status} for URL: ${fullUrl}`;
            console.log(errorMsg);
            if (isProductionPDF) {
              throw new Error(`${errorMsg} - Cannot create production PDF with broken images`);
            }
          }
        }
      } else {
        const errorMsg = '❌ No template preview_url available';
        console.log(errorMsg);
        if (isProductionPDF) {
          throw new Error(`${errorMsg} - Cannot create production PDF without template image`);
        }
      }
    } catch (e) {
      const errorMsg = `❌ Preview image fetch failed: ${(e as any)?.message}`;
      console.log(errorMsg);
      if (isProductionPDF) {
        throw new Error(`${errorMsg} - Production PDFs require valid embedded images`);
      }
    }

    // Build PDF via Gotenberg
    const headers: Record<string, string> = {};
    headers['Authorization'] = `Bearer ${GOTENBERG_API_KEY}`;
    headers['X-Api-Key'] = GOTENBERG_API_KEY;

    let gotenbergResp: Response | undefined;
    let usedStackedLayout = false;

    // Set dimensions based on format and orientation
    const isProd = format === 'production';
    const prodPortrait = pageOrientation === 'portrait';
    const paperWidth = isProd ? (prodPortrait ? '7' : '10.25') : '5.125';
    const paperHeight = isProd ? (prodPortrait ? '10.25' : '7') : '7';

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
      const frontHTML = buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight, brandingLogoDataUrl);
      // Generate HTML content for inside card using unified layout
      const insideHTML = generateUnifiedCardHTML('inside', {
        message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
        logoDataUrl,
        signatureDataUrl,
        templatePreviewUrl: previewDataUrl,
        brandingLogoDataUrl: '', // Don't show branding on inside page in debug mode
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
      const form = new FormData();
      
      if (includeFront) {
        // Always generate clean HTML for front cards to avoid badges and ensure proper positioning
        const frontHTML = buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight, brandingLogoDataUrl);
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
        brandingLogoDataUrl: '', // Don't show branding on inside page
      }, format, format === 'production');
      }

      if (includeFront && !includeInside) {
        // Front-only generation always uses HTML mode for clean output
        form.append('files', new File([buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight, brandingLogoDataUrl)], 'index.html', { type: 'text/html' }));
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
          brandingLogoDataUrl: '', // Don't show branding on inside-only PDF
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
        // Combined PDF: Generate as single HTML document with both pages
        console.log('Combined PDF Inside page: Signature data available:', !!signatureDataUrl, 'Logo data available:', !!logoDataUrl);
        
        const frontHTML = buildFrontHTML(template, previewDataUrl, format, paperWidth, paperHeight, brandingLogoDataUrl);
        let insideHTML = generateUnifiedCardHTML('inside', {
          message: order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.',
          logoDataUrl,
          signatureDataUrl,
          templatePreviewUrl: previewDataUrl,
          brandingLogoDataUrl: '', // Don't show branding on inside page of combined PDF
        }, format, format === 'production');
        
        // Make signature smaller for combined PDF
        insideHTML = insideHTML.replace('.sig { width: 480px;', '.sig { width: 320px;');
        
        // Extract head and body from each HTML to preserve their styles/scripts
        const extractSections = (html: string) => {
          const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          return { head: headMatch?.[1] || '', body: bodyMatch?.[1] || html };
        };
        
        const frontSections = extractSections(frontHTML);
        const insideSections = extractSections(insideHTML);
        
        let frontBody = frontSections.body;
        // Keep inline data URL for front image - asset approach was causing issues
        console.log('ℹ️ Using inline data URL for front image in combined PDF');
        
        // Build a single-page stacked layout: top = front, bottom = back/inside
        const combinedPaperHeight = String(parseFloat(paperHeight) * 2);
        usedStackedLayout = true;
        const combinedHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { 
      size: ${paperWidth}in ${combinedPaperHeight}in; 
      margin: 0;
    }
    html, body { margin: 0; padding: 0; width: ${paperWidth}in; height: ${combinedPaperHeight}in; }
    .stack { display: flex; flex-direction: column; width: 100%; height: 100%; }
    .half { width: 100%; height: 50%; position: relative; overflow: hidden; }
  </style>
  ${frontSections.head}
  ${insideSections.head}
</head>
<body>
  <div class="stack">
    <section class="half top">
      ${frontBody}
    </section>
    <section class="half bottom">
      ${insideSections.body}
    </section>
  </div>
</body>
</html>
        `;
        
        form.append('files', new File([combinedHTML], 'index.html', { type: 'text/html' }));
        form.append('paperWidth', paperWidth);
        form.append('paperHeight', combinedPaperHeight);
        form.append('marginTop', '0');
        form.append('marginBottom', '0');
        form.append('marginLeft', '0');
        form.append('marginRight', '0');
        form.append('landscape', 'false');
        form.append('preferCssPageSize', 'true');

        const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/html`;
        console.log('Calling Gotenberg (html) at:', url, 'includeFront:', includeFront, 'includeInside:', includeInside);
        gotenbergResp = await fetch(url, { method: 'POST', headers, body: form as any });
      }
    }

    if (!gotenbergResp) {
      throw new Error('Gotenberg request was not executed properly');
    }

    console.log('Gotenberg response status:', gotenbergResp.status);
    if (!gotenbergResp.ok) {
      const errText = await gotenbergResp.text();
      console.error('Gotenberg error response:', errText);
      throw new Error(`Gotenberg error (${gotenbergResp.status}): ${errText}`);
    }

    const pdfArrayBuffer = await gotenbergResp.arrayBuffer();
    let pdfBytes = new Uint8Array(pdfArrayBuffer);

    // Rotate PDF for PCM DirectMail if this is a production combined PDF
    // Front: 270° clockwise (top faces left), Back: 90° clockwise (top faces right)
    if (finalShouldRotate) {
      console.log('🔄 Applying PCM DirectMail rotation specifications...');
      pdfBytes = new Uint8Array(await rotatePDFForPCM(pdfBytes));
    }
    // Use a different folder for preview-only runs
    const folder = (format === 'production' && includeFront && includeInside && (previewOnly || false)) ? 'cards/previews' : 'cards';
    const pdfPath = `${folder}/${orderId}_gotenberg_${Date.now()}.pdf`;
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
    if (format === 'production' && includeFront && includeInside && !previewOnly) {
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
        ? `Gotenberg PDF generated successfully (2 pages: front + inside)${finalShouldRotate ? ' - rotated for PCM (front: 270°, back: 90°)' : ''}`
        : includeFront
          ? `Gotenberg PDF generated successfully (front only)${finalShouldRotate ? ' - rotated for PCM (front: 270°)' : ''}`
          : `Gotenberg PDF generated successfully (inside only)${finalShouldRotate ? ' - rotated for PCM (back: 90°)' : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('generate-card-gotenberg error:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    };
    
    console.error('Detailed error info:', JSON.stringify(errorDetails, null, 2));
    
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      details: errorDetails,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
