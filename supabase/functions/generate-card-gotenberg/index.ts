import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  orderId: string;
  only?: 'inside' | 'front' | 'front+inside';
  mode?: 'url' | 'html';
  origin?: string; // e.g., https://your-app.lovableproject.com
  fullUrl?: string; // direct URL to render
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, only, mode, origin, fullUrl } = await req.json() as GenerateRequest;
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

    // Download logo/signature and inline as data URLs so Gotenberg doesn't need external access
    let logoDataUrl = '';
    let signatureDataUrl = '';

    if (order.logo_url) {
      try {
        const { data } = await supabase.storage.from('holiday-cards').download(order.logo_url);
        if (data) {
          const buf = await data.arrayBuffer();
          const base64 = encodeBase64(new Uint8Array(buf));
          logoDataUrl = `data:image/png;base64,${base64}`;
        }
      } catch (e) {
        console.log('Logo download failed, continuing without logo:', e?.message);
      }
    }

    if (order.signature_url) {
      try {
        const { data } = await supabase.storage.from('holiday-cards').download(order.signature_url);
        if (data) {
          const buf = await data.arrayBuffer();
          const base64 = encodeBase64(new Uint8Array(buf));
          signatureDataUrl = `data:image/png;base64,${base64}`;
        }
      } catch (e) {
        console.log('Signature download failed, continuing without signature:', e?.message);
      }
    }

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

    const paperWidth = '5.125';
    const paperHeight = '7';

    if (mode === 'url') {
      // Render the live preview URL directly to PDF (single page)
      const shortId = String(order.id).replace(/-/g, '').slice(0, 8).toLowerCase();
      const base = (origin || req.headers.get('origin') || '').replace(/\/$/, '');
      const route = only === 'inside' ? 'inside' : 'front';
      const targetUrl = fullUrl || (base ? `${base}/#/preview/${route}/${shortId}` : '');

      if (!targetUrl) {
        throw new Error('No target URL provided; pass origin or fullUrl');
      }

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

      const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/url`;
      console.log('Calling Gotenberg (url) at:', url, 'for:', targetUrl);
      gotenbergResp = await fetch(url, { method: 'POST', headers, body: form as any });
    } else {
      // Build HTML and convert (supports multi-page)
      const form = new FormData();
      const frontHTML = buildFrontHTML(template, previewDataUrl);
      const insideHTML = buildInsideHTML(order, logoDataUrl, signatureDataUrl);

      if (includeFront && !includeInside) {
        form.append('files', new File([frontHTML], 'index.html', { type: 'text/html' }));
      } else if (includeInside && !includeFront) {
        form.append('files', new File([insideHTML], 'index.html', { type: 'text/html' }));
      } else {
        // both pages, ensure order: front then inside
        form.append('files', new File([frontHTML], 'index.html', { type: 'text/html' }));
        form.append('files', new File([insideHTML], 'page2.html', { type: 'text/html' }));
      }

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

    return new Response(JSON.stringify({
      success: true,
      pdfPath,
      downloadUrl: signed?.signedUrl || null,
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

function buildFrontHTML(template: any, previewDataUrl: string) {
  const imgSrc = previewDataUrl || template.preview_url || '';
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 5.125in 7in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 5.125in; height: 7in; }
      body { font-family: Arial, sans-serif; background: #ffffff; }
      .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      .frame { width: 100%; height: 100%; box-sizing: border-box; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff; }
      .img { width: 100%; height: 100%; object-fit: contain; display: block; background: #ffffff; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="frame">
        ${imgSrc ? `<img class="img" src="${imgSrc}" alt="${escapeHtml(template.name || 'Card front preview')}"/>` : ''}
      </div>
    </div>
  </body>
  </html>`;
}

function buildInsideHTML(order: any, logoDataUrl: string, signatureDataUrl: string) {
  const message = order?.custom_message || order?.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 5.125in 7in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 5.125in; height: 7in; }
      body { font-family: Georgia, serif; background: #ffffff; }
      .wrap { width: 100%; height: 100%; box-sizing: border-box; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff; }
      .grid { position: relative; display: grid; grid-template-rows: 1fr 1fr 1fr; width: 100%; height: 100%; padding: 32px; box-sizing: border-box; }
      .top { grid-row: 1 / 2; display: flex; align-items: center; justify-content: center; }
      .msg { text-align: center; max-width: 80%; font-size: 20px; line-height: 1.6; color: #111827; font-style: italic; margin: 0 auto; }
      .brand { position: absolute; left: 50%; transform: translateX(-50%); top: 56%; display: flex; align-items: center; justify-content: center; gap: 40px; width: 100%; padding: 0 32px; box-sizing: border-box; }
      .logo { max-width: 180px; max-height: 56px; object-fit: contain; }
      .sig { max-width: 160px; max-height: 48px; object-fit: contain; }
      .ph { color: #9ca3af; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="grid">
        <div class="top">
          <p class="msg">${escapeHtml(message)}</p>
        </div>
        <div class="brand">
          ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo"/>` : `<div class="ph">Company Logo</div>`}
          ${signatureDataUrl ? `<img class="sig" src="${signatureDataUrl}" alt="Signature"/>` : `<div class="ph">Signature</div>`}
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
