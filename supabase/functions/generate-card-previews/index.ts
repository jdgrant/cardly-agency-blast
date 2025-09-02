
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

  console.log('=== generate-card-previews function started ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    const body = await req.json() as GeneratePreviewsRequest;
    const { orderId } = body;
    console.log('Processing order ID:', orderId);

    if (!orderId) {
      console.error('No order ID provided');
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
    console.log('Gotenberg API Key available:', !!GOTENBERG_API_KEY);

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

    // Generate HTML content instead of using preview URLs for better reliability
    const encodeToDataUrl = async (path: string, isPdf = false) => {
      try {
        const { data } = await supabase.storage.from('holiday-cards').download(path);
        if (!data) return '';
        const buf = await data.arrayBuffer();
        const base64 = toBase64(new Uint8Array(buf));
        
        if (isPdf) {
          return `data:application/pdf;base64,${base64}`;
        }
        return `data:image/png;base64,${base64}`;
      } catch (e) {
        console.log('Failed to inline asset', path, e?.message);
        return '';
      }
    };

    // Handle signature URL - check if it's a full URL or path and if it's a PDF
    let signatureDataUrl = '';
    if (order.signature_url) {
      try {
        let signaturePath = order.signature_url;
        
        // If it's a full URL, extract the path
        if (order.signature_url.startsWith('https://')) {
          const urlParts = order.signature_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'holiday-cards');
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            signaturePath = urlParts.slice(bucketIndex + 1).join('/');
          }
        }
        
        // Check if it's a PDF and convert to image via Gotenberg
        const isPdf = signaturePath.toLowerCase().endsWith('.pdf');
        if (isPdf && GOTENBERG_URL && GOTENBERG_API_KEY) {
          console.log('Converting PDF signature to image:', signaturePath);
          
          // Download the PDF
          const { data: pdfData } = await supabase.storage.from('holiday-cards').download(signaturePath);
          if (pdfData) {
            // Convert PDF to base64 for embedding
            const pdfBuf = await pdfData.arrayBuffer();
            const pdfBase64 = toBase64(new Uint8Array(pdfBuf));
            const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
            
            // Create HTML wrapper to display PDF and screenshot it
            const pdfHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body { margin: 0; padding: 0; width: 400px; height: 200px; }
    body { background: #ffffff; overflow: hidden; }
    .pdf-container { width: 100%; height: 100%; }
    embed { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="pdf-container">
    <embed src="${pdfDataUrl}" type="application/pdf" />
  </div>
</body>
</html>`;
            
            const form = new FormData();
            form.append('files', new File([pdfHtml], 'signature.html', { type: 'text/html' }));
            form.append('emulatedMediaType', 'print');
            form.append('waitDelay', '2000ms');
            form.append('width', '400');
            form.append('height', '200');
            
            const headers: Record<string, string> = {
              'Authorization': `Bearer ${GOTENBERG_API_KEY}`,
              'X-Api-Key': GOTENBERG_API_KEY,
            };
            
            const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshot/html`;
            const resp = await fetch(url, { method: 'POST', headers, body: form as any });
            
            if (resp.ok) {
              const ct = resp.headers.get('content-type') || '';
              const buf = await resp.arrayBuffer();
              
              if (ct.includes('zip')) {
                // Extract PNG from ZIP
                const u8 = new Uint8Array(buf);
                const sig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
                let start = -1;
                for (let i = 0; i < u8.length - sig.length; i++) {
                  let match = true;
                  for (let j = 0; j < sig.length; j++) if (u8[i+j] !== sig[j]) { match = false; break; }
                  if (match) { start = i; break; }
                }
                if (start >= 0) {
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
                    signatureDataUrl = `data:image/png;base64,${base64}`;
                    console.log('PDF signature converted to image successfully');
                  }
                }
              } else {
                const base64 = toBase64(new Uint8Array(buf));
                signatureDataUrl = `data:image/png;base64,${base64}`;
                console.log('PDF signature converted to image successfully');
              }
            } else {
              console.log('PDF conversion failed:', resp.status, await resp.text());
            }
          }
        } else {
          // Handle as regular image
          signatureDataUrl = await encodeToDataUrl(signaturePath);
        }
      } catch (e) {
        console.log('Error processing signature:', e?.message);
      }
    }

    const logoDataUrl = order.logo_url ? await encodeToDataUrl(order.logo_url) : '';

    // Handle template preview image - convert local paths to data URLs
    let previewDataUrl = '';
    try {
      const src = template.preview_url || '';
      console.log('Processing template preview URL:', src);
      
      if (/^https?:\/\//i.test(src)) {
        // External URL - fetch directly
        const resp = await fetch(src);
        if (resp.ok) {
          const ct = resp.headers.get('content-type') || 'image/png';
          const buf = await resp.arrayBuffer();
          const base64 = toBase64(new Uint8Array(buf));
          previewDataUrl = `data:${ct};base64,${base64}`;
        }
      } else if (src.startsWith('/lovable-uploads/')) {
        // Local lovable-uploads path - use origin header approach like generate-card-gotenberg
        const origin = req.headers.get('origin') || '';
        console.log('Origin header:', origin);
        console.log('All request headers:', Object.fromEntries(req.headers.entries()));
        
        if (origin) {
          const fullUrl = `${origin}${src}`;
          console.log('Fetching preview from:', fullUrl);
          
          const resp = await fetch(fullUrl);
          if (resp.ok) {
            const ct = resp.headers.get('content-type') || 'image/png';
            const buf = await resp.arrayBuffer();
            const base64 = toBase64(new Uint8Array(buf));
            previewDataUrl = `data:${ct};base64,${base64}`;
            console.log('Preview image fetched and inlined successfully');
          } else {
            console.log('Failed to fetch preview image, status:', resp.status);
          }
        } else {
          console.log('No origin header available for local path, trying hardcoded approach');
          // Fallback: try the current domain directly 
          const fallbackUrl = `https://e84fd20e-7cca-4259-84ad-12452c25e301.sandbox.lovable.dev${src}`;
          console.log('Trying fallback URL:', fallbackUrl);
          
          try {
            const resp = await fetch(fallbackUrl);
            if (resp.ok) {
              const ct = resp.headers.get('content-type') || 'image/png';
              const buf = await resp.arrayBuffer();
              const base64 = toBase64(new Uint8Array(buf));
              previewDataUrl = `data:${ct};base64,${base64}`;
              console.log('Preview image fetched via fallback successfully');
            } else {
              console.log('Fallback fetch failed, status:', resp.status);
            }
          } catch (fallbackError) {
            console.log('Fallback fetch error:', fallbackError);
          }
        }
      }
    } catch (e) {
      console.log('Preview image fetch failed:', (e as any)?.message);
    }

    if (!previewDataUrl) {
      console.log('Warning: No preview image data URL generated for template:', template.id);
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
    ${imgSrc ? `<img class="img" src="${imgSrc}" alt="Front"/>` : '<div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;">No Preview Available</div>'}
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
    .brand { position: absolute; left: 50%; transform: translateX(-50%); top: 56%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; width: 100%; padding: 0 32px; box-sizing: border-box; }
    .logo { max-width: 180px; max-height: 56px; object-fit: contain; }
    .sig { width: 320px; object-fit: contain; }
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
        ${signatureDataUrl ? `<img class="sig" src="${signatureDataUrl}" alt="Signature"/>` : ``}
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

        const screenshot = async (html: string, selector: string) => {
          const form = new FormData();
          form.append('files', new File([html], 'index.html', { type: 'text/html' }));
          form.append('emulatedMediaType', 'print');
          form.append('waitDelay', '1000ms');
          // Match exact 5.125in x 7in at 96 CSS px/in to avoid whitespace
          form.append('width', String(Math.round(5.125 * 96)));
          form.append('height', String(Math.round(7 * 96)));
          // Crop to the card element so no extra canvas space is captured
          form.append('selector', selector);
          const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshot/html`;
          const resp = await fetch(url, { method: 'POST', headers, body: form as any });
          if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Screenshot failed (${resp.status}): ${t}`);
          }
          const ct = resp.headers.get('content-type') || '';
          const buf = await resp.arrayBuffer();
          if (ct.includes('zip')) {
            const u8 = new Uint8Array(buf);
            const sig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
            let start = -1;
            for (let i = 0; i < u8.length - sig.length; i++) {
              let match = true;
              for (let j = 0; j < sig.length; j++) if (u8[i+j] !== sig[j]) { match = false; break; }
              if (match) { start = i; break; }
            }
            if (start >= 0) {
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
            const base64 = toBase64(new Uint8Array(buf));
            return `data:image/png;base64,${base64}`;
          }
        };

        console.log('Generating front preview...');
        frontB64 = await screenshot(buildFrontPortraitHTML(), '.frame');
        console.log('Front preview generated successfully');
        
        console.log('Generating inside preview...');
        insideB64 = await screenshot(buildInsidePortraitHTML(), '.wrap');
        console.log('Inside preview generated successfully');
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

    console.log('Previews saved successfully to database');

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
