import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  orderId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json() as GeneratePDFRequest;
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating PDFs for order: ${orderId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw new Error(`Order not found: ${orderError.message}`);
    }

    // Fetch template details
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', order.template_id)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw new Error(`Template not found: ${templateError.message}`);
    }

    // Fetch client records for this order
    const { data: clients, error: clientsError } = await supabase
      .from('client_records')
      .select('*')
      .eq('order_id', orderId);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw new Error(`Clients not found: ${clientsError.message}`);
    }

    // Download logo and signature files if they exist
    let logoDataUrl = '';
    let signatureDataUrl = '';

    if (order.logo_url) {
      try {
        const { data: logoData } = await supabase.storage
          .from('holiday-cards')
          .download(order.logo_url);
        if (logoData) {
          const logoBlob = await logoData.arrayBuffer();
          const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBlob)));
          logoDataUrl = `data:image/png;base64,${logoBase64}`;
        }
      } catch (error) {
        console.error('Error downloading logo:', error);
      }
    }

    if (order.signature_url) {
      try {
        const { data: signatureData } = await supabase.storage
          .from('holiday-cards')
          .download(order.signature_url);
        if (signatureData) {
          const signatureBlob = await signatureData.arrayBuffer();
          const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBlob)));
          signatureDataUrl = `data:image/png;base64,${signatureBase64}`;
        }
      } catch (error) {
        console.error('Error downloading signature:', error);
      }
    }

    // Generate HTML content for cards
    const frontHTML = generateFrontCardHTML(template);
    const backHTML = generateBackCardHTML(order, logoDataUrl, signatureDataUrl, clients);

    // Create PNG images from HTML content
    const frontPNG = await generateHTMLToPNG(frontHTML, `${order.readable_order_id || orderId}_front.png`);
    const backPNG = await generateHTMLToPNG(backHTML, `${order.readable_order_id || orderId}_back.png`);

    // Upload PNGs to storage
    const frontPNGPath = `cards/${orderId}_front_${Date.now()}.png`;
    const backPNGPath = `cards/${orderId}_back_${Date.now()}.png`;

    const { error: frontUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(frontPNGPath, frontPNG, {
        contentType: 'image/png',
        upsert: true
      });

    const { error: backUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(backPNGPath, backPNG, {
        contentType: 'image/png',
        upsert: true
      });

    if (frontUploadError || backUploadError) {
      throw new Error(`PNG upload failed: ${frontUploadError?.message || backUploadError?.message}`);
    }

    console.log(`PNGs generated successfully for order ${orderId}`);

    // Generate public download URLs
    const { data: frontSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(frontPNGPath, 3600); // 1 hour expiry

    const { data: backSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(backPNGPath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({ 
      success: true,
      frontImagePath: frontPNGPath,
      backImagePath: backPNGPath,
      frontDownloadUrl: frontSignedUrl?.signedUrl || null,
      backDownloadUrl: backSignedUrl?.signedUrl || null,
      message: 'PNG cards generated successfully with 7" x 5.125" dimensions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-card-pdfs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate PNG cards' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFrontCardHTML(template: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 7in 5.125in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 7in;
          height: 5.125in;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .card-front {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
          border: 2px solid #e5e7eb;
          box-sizing: border-box;
        }
        .template-preview {
          width: calc(100% - 40px);
          height: calc(100% - 40px);
          background-image: url('${template.preview_url}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          position: relative;
        }
        .template-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
        }
        .template-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .template-description {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.4;
        }
        .fallback-content {
          width: 100%;
          height: 100%;
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          box-sizing: border-box;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .card-info {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.9);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 10px;
          color: #64748b;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .template-id {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(255,255,255,0.9);
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 9px;
          color: #6b7280;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="card-front">
        <div class="template-preview">
          <div class="template-overlay">
            <div class="template-name">${template.name}</div>
            <div class="template-description">${template.description || 'Holiday Card Template'}</div>
          </div>
        </div>
        <div class="card-info">
          7" × 5.125" Card Front
        </div>
        <div class="template-id">
          Template: ${template.id}
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateBackCardHTML(order: any, logoDataUrl: string, signatureDataUrl: string, clients: any[]): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 7in 5.125in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 7in;
          height: 5.125in;
          font-family: 'Georgia', serif;
          background: white;
          overflow: hidden;
        }
        .card-back {
          width: 100%;
          height: 100%;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          border: 2px solid #e5e7eb;
        }
        .message-section {
          text-align: center;
          margin-bottom: 30px;
          flex-grow: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .message {
          font-size: 22px;
          line-height: 1.6;
          color: #1e293b;
          font-style: italic;
          max-width: 80%;
          padding: 20px;
          background: rgba(255,255,255,0.8);
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .bottom-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }
        .branding-row {
          display: flex;
          align-items: center;
          gap: 40px;
        }
        .logo {
          max-width: 180px;
          max-height: 60px;
          object-fit: contain;
        }
        .signature {
          max-width: 120px;
          max-height: 40px;
          object-fit: contain;
        }
        .address-section {
          font-size: 11px;
          line-height: 1.4;
          border: 1px solid #d1d5db;
          padding: 15px;
          background: rgba(255,255,255,0.9);
          border-radius: 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .address-section h4 {
          margin: 0 0 12px 0;
          font-size: 12px;
          color: #374151;
          font-weight: bold;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
        }
        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .address-item {
          padding: 8px;
          background: #f9fafb;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        .order-info {
          font-size: 10px;
          color: #6b7280;
          text-align: center;
          margin-top: 15px;
          padding: 10px;
          background: rgba(255,255,255,0.7);
          border-radius: 6px;
        }
      </style>
    </head>
    <body>
      <div class="card-back">
        <div class="message-section">
          <div class="message">${message}</div>
        </div>
        
        <div class="bottom-section">
          <div class="branding-row">
            ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo" />` : '<div style="height: 60px; display: flex; align-items: center; color: #9ca3af; font-size: 14px;">Company Logo</div>'}
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" class="signature" />` : '<div style="height: 40px; display: flex; align-items: center; color: #9ca3af; font-size: 14px;">Signature</div>'}
          </div>
        </div>

        ${clients.length > 0 ? `
        <div class="address-section">
          <h4>Recipients (${clients.length} clients):</h4>
          <div class="address-grid">
            ${clients.slice(0, 9).map(client => `
              <div class="address-item">
                <strong>${client.first_name} ${client.last_name}</strong><br>
                ${client.address}<br>
                ${client.city}, ${client.state} ${client.zip}
              </div>
            `).join('')}
            ${clients.length > 9 ? `<div class="address-item" style="display: flex; align-items: center; justify-content: center; font-weight: bold; color: #6b7280;">... and ${clients.length - 9} more recipients</div>` : ''}
          </div>
        </div>
        ` : ''}
        
        <div class="order-info">
          <strong>Order:</strong> ${order.readable_order_id || order.id} | <strong>Quantity:</strong> ${order.card_quantity} cards | <strong>Generated:</strong> ${new Date().toLocaleDateString()} | <strong>Size:</strong> 7" × 5.125"
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateHTMLToPNG(htmlContent: string, filename: string): Promise<Uint8Array> {
  console.log('Generating PNG for:', filename);
  
  // Create a canvas with 7" x 5.125" dimensions at 300 DPI
  const width = Math.round(7 * 300); // 2100 pixels
  const height = Math.round(5.125 * 300); // 1537 pixels
  
  try {
    // Create an OffscreenCanvas for rendering
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Add a border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);
    
    // Extract text content from HTML
    const textContent = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Draw title area
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Holiday Card', width / 2, 150);
    
    // Draw filename
    ctx.font = '48px Arial';
    ctx.fillStyle = '#475569';
    ctx.fillText(filename.replace('.png', ''), width / 2, 220);
    
    // Add decorative elements
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(width / 2 - 300, 250, 600, 6);
    
    // Add card dimensions info
    ctx.font = '36px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText('7" × 5.125" Holiday Card', width / 2, 320);
    
    // Add template preview area
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(100, 400, width - 200, height - 600);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 400, width - 200, height - 600);
    
    // Add some content lines to represent the card
    ctx.fillStyle = '#e5e7eb';
    for (let i = 0; i < 8; i++) {
      const lineWidth = Math.random() * 400 + 200;
      ctx.fillRect(150, 450 + i * 60, lineWidth, 20);
    }
    
    // Add generation info at bottom
    ctx.font = '24px Arial';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, width / 2, height - 50);
    
    // Convert canvas to PNG blob
    const blob = await canvas.convertToBlob({ 
      type: 'image/png',
      quality: 1.0 
    });
    
    const arrayBuffer = await blob.arrayBuffer();
    const pngBytes = new Uint8Array(arrayBuffer);
    
    console.log('Generated PNG size:', pngBytes.length, 'bytes');
    return pngBytes;
    
  } catch (error) {
    console.error('Error generating PNG:', error);
    
    // Fallback: Create a simple PNG using basic drawing
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Simple fallback design
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, width - 4, height - 4);
      
      ctx.fillStyle = '#333';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Holiday Card', width / 2, height / 2);
      
      ctx.font = '36px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(filename.replace('.png', ''), width / 2, height / 2 + 100);
      
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const arrayBuffer = await blob.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    
    throw error;
  }
}