import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
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
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
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
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
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

    // Build HTML for portrait inside (5.125" x 7") mirroring production layout
    const buildInsidePortraitHTML = () => {
      // Split message similar to production function
      const message: string = order?.custom_message || order?.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
      const text = String(message || '');
      const halfLength = Math.floor(text.length / 2);
      const words = text.split(' ');
      let characterCount = 0;
      let splitIndex = 0;
      for (let i = 0; i < words.length; i++) {
        const wordLength = words[i].length + (i > 0 ? 1 : 0);
        if (characterCount + wordLength >= halfLength) {
          const beforeSplit = characterCount;
          const afterSplit = characterCount + wordLength;
          splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
          break;
        }
        characterCount += wordLength;
      }
      let first = text;
      let second = '';
      if (splitIndex > 0 && splitIndex < words.length && text.length > 30) {
        first = words.slice(0, splitIndex).join(' ');
        second = words.slice(splitIndex).join(' ');
      }

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; width: 5.125in; height: 7in; }
    body { font-family: Georgia, serif; background: #ffffff; position: relative; }
    .msg { text-align: center; max-width: 85%; font-size: 20px; line-height: 1.6; color: #111827; font-style: italic; margin: 0 auto; }
    .msgRow { position: absolute; left: 50%; transform: translateX(-50%); top: 28%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
    .logoRow { position: absolute; left: 50%; transform: translateX(-50%); top: 60%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
    .logo { max-width: 220px; max-height: 72px; object-fit: contain; }
    .sigRow { position: absolute; left: 50%; transform: translateX(-50%); top: 80%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
    .sig { max-width: 220px; max-height: 70px; object-fit: contain; }
  </style>
</head>
<body>
  <div class="msgRow"><p class="msg">${escapeHtml(first)}${second ? '<br />' + escapeHtml(second) : ''}</p></div>
  ${logoDataUrl ? `<div class="logoRow"><img class="logo" src="${logoDataUrl}" alt="Logo"/></div>` : ''}
  ${signatureDataUrl ? `<div class="sigRow"><img class="sig" src="${signatureDataUrl}" alt="Signature"/></div>` : ''}
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
          const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshots/html`;
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
                return `data:image/png;base64,${btoa(String.fromCharCode(...pngBytes))}`;
              }
            }
            throw new Error('Could not extract PNG from ZIP');
          } else {
            // Assume PNG directly
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            return `data:image/png;base64,${base64}`;
          }
        };

        frontB64 = await screenshot(buildFrontPortraitHTML());
        insideB64 = await screenshot(buildInsidePortraitHTML());
      } catch (e) {
        console.log('Gotenberg screenshot failed, will fallback to canvas:', (e as any)?.message);
      }
    }

    // Fallback: draw with OffscreenCanvas (ensures consistent previews)
    if (!frontB64) {
      frontB64 = await drawFrontCanvas(previewDataUrl || template.preview_url || '');
    }
    if (!insideB64) {
      insideB64 = await drawInsideCanvas(order, logoDataUrl, signatureDataUrl);
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

// ========== Canvas fallback helpers ==========
async function drawFrontCanvas(imgSrc: string): Promise<string> {
  const width = 768; // ~5.125in at ~150dpi
  const height = 1050; // ~7in at ~150dpi
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (imgSrc) {
    try {
      const resp = await fetch(imgSrc);
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      // object-fit: cover
      const imgW = bmp.width, imgH = bmp.height;
      const scale = Math.max(width / imgW, height / imgH);
      const dw = imgW * scale;
      const dh = imgH * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2;
      ctx.drawImage(bmp, dx, dy, dw, dh);
    } catch (e) {
      console.log('Front image draw failed:', (e as any)?.message);
    }
  }

  const out = await canvas.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await out.arrayBuffer());
  return `data:image/png;base64,${btoa(String.fromCharCode(...buf))}`;
}

async function drawInsideCanvas(order: any, logoDataUrl: string, signatureDataUrl: string): Promise<string> {
  const width = 768;
  const height = 1050;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Message
  const message: string = order?.custom_message || order?.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  const text = String(message || '');
  const halfLength = Math.floor(text.length / 2);
  const words = text.split(' ');
  let characterCount = 0;
  let splitIndex = 0;
  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].length + (i > 0 ? 1 : 0);
    if (characterCount + wordLength >= halfLength) {
      const beforeSplit = characterCount;
      const afterSplit = characterCount + wordLength;
      splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
      break;
    }
    characterCount += wordLength;
  }
  let first = text;
  let second = '';
  if (splitIndex > 0 && splitIndex < words.length && text.length > 30) {
    first = words.slice(0, splitIndex).join(' ');
    second = words.slice(splitIndex).join(' ');
  }

  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.font = 'italic 28px Georgia';
  const msgY = Math.floor(height * 0.28);
  const maxWidth = Math.floor(width * 0.85);
  ctx.fillText(first, width / 2, msgY, maxWidth);
  if (second) ctx.fillText(second, width / 2, msgY + 34, maxWidth);

  // Logo at ~60%
  if (logoDataUrl) {
    try {
      const resp = await fetch(logoDataUrl);
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const maxW = Math.min(220, Math.floor(width * 0.6));
      const maxH = Math.min(72, Math.floor(height * 0.12));
      const ratio = Math.min(maxW / bmp.width, maxH / bmp.height);
      const dw = bmp.width * ratio;
      const dh = bmp.height * ratio;
      const y = Math.floor(height * 0.60) - Math.floor(dh / 2);
      ctx.drawImage(bmp, Math.floor(width / 2 - dw / 2), y, dw, dh);
    } catch (e) {
      console.log('Logo draw failed:', (e as any)?.message);
    }
  }

  // Signature at ~80%
  if (signatureDataUrl) {
    try {
      const resp = await fetch(signatureDataUrl);
      const blob = await resp.blob();
      const bmp = await createImageBitmap(blob);
      const maxW = Math.min(220, Math.floor(width * 0.6));
      const maxH = Math.min(70, Math.floor(height * 0.10));
      const ratio = Math.min(maxW / bmp.width, maxH / bmp.height);
      const dw = bmp.width * ratio;
      const dh = bmp.height * ratio;
      const y = Math.floor(height * 0.80) - Math.floor(dh / 2);
      ctx.drawImage(bmp, Math.floor(width / 2 - dw / 2), y, dw, dh);
    } catch (e) {
      console.log('Signature draw failed:', (e as any)?.message);
    }
  }

  const out = await canvas.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await out.arrayBuffer());
  return `data:image/png;base64,${btoa(String.fromCharCode(...buf))}`;
}
