
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

    // Get the origin from request headers or use fallback
    const origin = req.headers.get('origin') || 'https://e84fd20e-7cca-4259-84ad-12452c25e301.sandbox.lovable.dev';
    
    // Build preview URLs instead of HTML
    const frontPreviewUrl = `${origin}/#/preview/front/${orderId}`;
    const insidePreviewUrl = `${origin}/#/preview/inside/${orderId}`;
    
    console.log('Using front preview URL:', frontPreviewUrl);
    console.log('Using inside preview URL:', insidePreviewUrl);

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

        const screenshotUrl = async (url: string, description: string) => {
          const form = new FormData();
          form.append('url', url);
          form.append('emulatedMediaType', 'print');
          form.append('waitDelay', '2000ms');
          // Match exact 5.125in x 7in at 96 CSS px/in to avoid whitespace
          form.append('width', String(Math.round(5.125 * 96)));
          form.append('height', String(Math.round(7 * 96)));
          
          const gotenbergUrl = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshot/url`;
          const resp = await fetch(gotenbergUrl, { method: 'POST', headers, body: form as any });
          if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Screenshot failed for ${description} (${resp.status}): ${t}`);
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

        console.log('Generating front preview from URL...');
        frontB64 = await screenshotUrl(frontPreviewUrl, 'front preview');
        console.log('Front preview generated successfully');
        
        console.log('Generating inside preview from URL...');
        insideB64 = await screenshotUrl(insidePreviewUrl, 'inside preview');
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
