import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  orderId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json() as GenerateRequest;
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
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
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
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          signatureDataUrl = `data:image/png;base64,${base64}`;
        }
      } catch (e) {
        console.log('Signature download failed, continuing without signature:', e?.message);
      }
    }

    // Build HTML for two pages
    const frontHTML = buildFrontHTML(template);
    const insideHTML = buildInsideHTML(order, logoDataUrl, signatureDataUrl);

    // Prepare multipart form for Gotenberg
    const form = new FormData();
    form.append('files', new File([frontHTML], 'front.html', { type: 'text/html' }));
    form.append('files', new File([insideHTML], 'inside.html', { type: 'text/html' }));

    // Page size: 7in x 5.125in, small margins
    form.append('paperWidth', '7');
    form.append('paperHeight', '5.125');
    form.append('marginTop', '0');
    form.append('marginBottom', '0');
    form.append('marginLeft', '0');
    form.append('marginRight', '0');
    form.append('landscape', 'false');
    form.append('preferCssPageSize', 'true');

    const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/convert/html`;

    const headers: Record<string, string> = {};
    // Send both Authorization and X-Api-Key for compatibility
    headers['Authorization'] = `Bearer ${GOTENBERG_API_KEY}`;
    headers['X-Api-Key'] = GOTENBERG_API_KEY;

    const gotenbergResp = await fetch(url, {
      method: 'POST',
      headers,
      body: form as any,
    });

    if (!gotenbergResp.ok) {
      const errText = await gotenbergResp.text();
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
      message: 'Gotenberg PDF generated successfully (2 pages: front + inside)'
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

function buildFrontHTML(template: any) {
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 7in 5.125in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 7in; height: 5.125in; }
      body { font-family: Arial, sans-serif; }
      .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; }
      .preview { position: relative; width: calc(100% - 40px); height: calc(100% - 40px); border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #f8fafc; display: flex; align-items: center; justify-content: center; }
      .title { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 20px; color: #fff; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.75) 100%); font-weight: 700; font-size: 20px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="preview">
        <div class="title">${template.name || 'Holiday Card Front'}</div>
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
      @page { size: 7in 5.125in; margin: 0; }
      html, body { margin: 0; padding: 0; width: 7in; height: 5.125in; }
      body { font-family: Georgia, serif; }
      .wrap { width: 100%; height: 100%; box-sizing: border-box; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); border: 2px solid #e5e7eb; }
      .message { text-align: center; font-size: 22px; line-height: 1.6; color: #1e293b; font-style: italic; background: rgba(255,255,255,0.8); padding: 16px 20px; border-radius: 12px; margin: 8px auto; max-width: 80%; }
      .brand { display: flex; align-items: center; justify-content: center; gap: 40px; }
      .logo { max-width: 180px; max-height: 60px; object-fit: contain; }
      .sig { max-width: 140px; max-height: 44px; object-fit: contain; }
      .placeholder { color: #9ca3af; font-size: 12px; }
      .meta { font-size: 10px; color: #6b7280; text-align: center; padding-top: 8px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="message">${escapeHtml(message)}</div>
      <div class="brand">
        ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo"/>` : `<div class="placeholder">Company Logo</div>`}
        ${signatureDataUrl ? `<img class="sig" src="${signatureDataUrl}" alt="Signature"/>` : `<div class="placeholder">Signature</div>`}
      </div>
      <div class="meta">Order ${order?.readable_order_id || order?.id} • Quantity ${order?.card_quantity} • Size 7&quot; × 5.125&quot;</div>
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
