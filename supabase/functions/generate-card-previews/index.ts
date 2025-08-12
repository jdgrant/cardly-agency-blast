import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toBase64(u8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

interface GeneratePreviewsRequest {
  orderId: string;
  regenerate?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as GeneratePreviewsRequest;
    const { orderId } = body;

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

    console.log('generate-card-previews using Gotenberg:', GOTENBERG_URL);

    // Fetch order & template
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) throw new Error(orderError?.message || 'Order not found');

    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', order.template_id)
      .maybeSingle();

    if (templateError || !template) throw new Error(templateError?.message || 'Template not found');

    // Inline assets
    const encodeToDataUrl = async (path: string) => {
      try {
        const { data } = await supabase.storage.from('holiday-cards').download(path);
        if (!data) return '';
        const buf = await data.arrayBuffer();
        const base64 = toBase64(new Uint8Array(buf));
        return `data:image/png;base64,${base64}`;
      } catch (e) {
        console.log('Failed to inline asset', path, e?.message);
        return '';
      }
    };

    const logoDataUrl = order.logo_url ? await encodeToDataUrl(order.logo_url) : '';
    const signatureDataUrl = order.signature_url ? await encodeToDataUrl(order.signature_url) : '';

    // Ensure we have a preview image URL for the template (absolute URL or data URL)
    let previewDataUrl = '';
    try {
      const src = template.preview_url || '';
      if (/^https?:\/\//i.test(src)) {
        const resp = await fetch(src);
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || 'image/png';
          const buf = await resp.arrayBuffer();
          const base64 = toBase64(new Uint8Array(buf));
          previewDataUrl = `data:${ct};base64,${base64}`;
        }
      } else if (src.startsWith('/lovable-uploads/')) {
        // The web app will serve these publicly; attempt to fetch via Supabase URL base if provided
        const base = req.headers.get('origin') || '';
        if (base) {
          const url = `${base}${src}`;
          const resp = await fetch(url);
          if (resp.ok) {
            const ct = resp.headers.get('content-type') || 'image/png';
            const buf = await resp.arrayBuffer();
            const base64 = toBase64(new Uint8Array(buf));
            previewDataUrl = `data:${ct};base64,${base64}`;
          }
        }
      }
    } catch (e) {
      console.log('Preview image fetch failed:', (e as any)?.message);
    }

    // Build HTML for portrait front (5.125" x 7") using same production logic (cover)
    const buildFrontPortraitHTML = () => {
      const imgSrc = previewDataUrl || template.preview_url || '';
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; width: 5.125in; height: 7in; }
    body { background: #ffffff; }
    .frame { width: 100%; height: 100%; overflow: hidden; }
    .img { width: 100%; height: 100%; object-fit: cover; display: block; }
  </style>
</head>
<body>
  <div class="frame">
    ${imgSrc ? `<img class="img" src="${imgSrc}" alt="Front"/>` : ''}
  </div>
</body>
</html>`;
    };

    // Build HTML for portrait inside (5.125" x 7") mirroring PDF preview rules
    const buildInsidePortraitHTML = () => {
      const message: string = order?.custom_message || order?.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
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
    };

    // Helper for escaping HTML
    function escapeHtml(s: string) {
      return s.replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c] as string));
    }

    // Prefer Gotenberg screenshots; if not configured, draw with canvas as fallback
    let frontB64 = '';
    let insideB64 = '';

    const canUseGotenberg = !!(GOTENBERG_URL && GOTENBERG_API_KEY);

    if (canUseGotenberg) {
      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${GOTENBERG_API_KEY}`,
          'X-Api-Key': GOTENBERG_API_KEY,
        };

        const screenshot = async (html: string) => {
          const form = new FormData();
          form.append('files', new File([html], 'index.html', { type: 'text/html' }));
          form.append('emulatedMediaType', 'print');
          form.append('waitDelay', '1000ms');
          // Viewport close to 5.125 x 7 at ~200 dpi
          form.append('width', '1024');
          form.append('height', '1400');
          const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshot/html`;
          const resp = await fetch(url, { method: 'POST', headers, body: form as any });
          if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Screenshot failed (${resp.status}): ${t}`);
          }
          const ct = resp.headers.get('content-type') || '';
          const buf = await resp.arrayBuffer();
          // If zip, try to parse minimal Zip (very naive: look for PNG header and slice)
          if (ct.includes('zip')) {
            const u8 = new Uint8Array(buf);
            // Search for PNG signature 89 50 4E 47 0D 0A 1A 0A
            const sig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
            let start = -1;
            for (let i = 0; i < u8.length - sig.length; i++) {
              let match = true;
              for (let j = 0; j < sig.length; j++) if (u8[i+j] !== sig[j]) { match = false; break; }
              if (match) { start = i; break; }
            }
            if (start >= 0) {
              // Find IEND chunk signature 49 45 4E 44 AE 42 60 82
              const endSig = [0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82];
              let end = -1;
              for (let i = start + 8; i < u8.length - endSig.length; i++) {
                let match = true;
                for (let j = 0; j < endSig.length; j++) if (u8[i+j] !== endSig[j]) { match = false; break; }
                if (match) { end = i + endSig.length; break; }
              }
              if (end > start) {
                const pngBytes = u8.slice(start, end);
                const base64 = toBase64(pngBytes);
                return `data:image/png;base64,${base64}`;
              }
            }
            throw new Error('Could not extract PNG from ZIP');
          } else {
            // Assume PNG directly
            const base64 = toBase64(new Uint8Array(buf));
            return `data:image/png;base64,${base64}`;
          }
        };

        frontB64 = await screenshot(buildFrontPortraitHTML());
        insideB64 = await screenshot(buildInsidePortraitHTML());
      } catch (e) {
        console.log('Gotenberg screenshot failed, will fallback to canvas:', (e as any)?.message);
      }
    }

    if (!frontB64 || !insideB64) {
      throw new Error('Preview generation failed. Check Gotenberg configuration.');
    }

    // Save in DB
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        front_preview_base64: frontB64,
        inside_preview_base64: insideB64,
        previews_updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, frontBase64: frontB64, insideBase64: insideB64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-card-previews error:', error);
    return new Response(JSON.stringify({ error: (error as any).message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
