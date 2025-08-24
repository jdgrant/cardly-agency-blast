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

    // Create SVG files instead of PNG for better compatibility
    const frontSVG = await generateHTMLToSVG(frontHTML, `${order.readable_order_id || orderId}_front.svg`);
    const backSVG = await generateHTMLToSVG(backHTML, `${order.readable_order_id || orderId}_back.svg`);

    // Upload SVGs to storage
    const frontSVGPath = `cards/${orderId}_front_${Date.now()}.svg`;
    const backSVGPath = `cards/${orderId}_back_${Date.now()}.svg`;

    const { error: frontUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(frontSVGPath, frontSVG, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    const { error: backUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(backSVGPath, backSVG, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (frontUploadError || backUploadError) {
      throw new Error(`SVG upload failed: ${frontUploadError?.message || backUploadError?.message}`);
    }

    console.log(`SVG cards generated successfully for order ${orderId}`);

    // Generate public download URLs
    const { data: frontSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(frontSVGPath, 3600); // 1 hour expiry

    const { data: backSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(backSVGPath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({ 
      success: true,
      frontImagePath: frontSVGPath,
      backImagePath: backSVGPath,
      frontDownloadUrl: frontSignedUrl?.signedUrl || null,
      backDownloadUrl: backSignedUrl?.signedUrl || null,
      message: 'SVG cards generated successfully with 7" x 5.125" dimensions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-card-pdfs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate SVG cards' 
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
            ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" class="signature" />` : ''}
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

async function generateHTMLToSVG(htmlContent: string, filename: string): Promise<Uint8Array> {
  console.log('Generating SVG for:', filename);
  
  // Create SVG with proper dimensions (7" x 5.125" at 96 DPI for web display)
  const width = 672; // 7 inches * 96 DPI
  const height = 492; // 5.125 inches * 96 DPI
  
  // Determine if this is front or back card based on filename
  const isBackCard = filename.includes('_back');
  
  try {
    // Extract text content from HTML for display
    const textContent = htmlContent
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Create different SVG content for front vs back cards
    let svg: string;
    
    if (isBackCard) {
      // Back card design with message and address information
      svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fafafa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#backGrad)"/>
  
  <!-- Border -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#e5e7eb" stroke-width="2"/>
  
  <!-- Header -->
  <text x="${width / 2}" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#1e293b">Holiday Card - Back</text>
  
  <!-- Message section -->
  <rect x="50" y="60" width="${width - 100}" height="120" fill="rgba(255,255,255,0.8)" stroke="#e5e7eb" stroke-width="1" rx="6"/>
  <text x="${width / 2}" y="85" text-anchor="middle" font-family="Georgia, serif" font-size="16" font-style="italic" fill="#1e293b">Holiday Message</text>
  <text x="${width / 2}" y="110" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#374151">Warmest wishes for a joyful</text>
  <text x="${width / 2}" y="125" text-anchor="middle" font-family="Georgia, serif" font-size="12" fill="#374151">and restful holiday season.</text>
  <text x="${width / 2}" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="10" fill="#6b7280">From your friends at [Company Name]</text>
  
  <!-- Branding section -->
  <rect x="100" y="200" width="200" height="40" fill="rgba(255,255,255,0.9)" stroke="#d1d5db" stroke-width="1" rx="4"/>
  <text x="200" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#9ca3af">Company Logo</text>
  
  <rect x="320" y="200" width="200" height="40" fill="rgba(255,255,255,0.9)" stroke="#d1d5db" stroke-width="1" rx="4"/>
  <text x="420" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#9ca3af">Additional Branding</text>
  
  <!-- Recipients info -->
  <rect x="50" y="260" width="${width - 100}" height="150" fill="rgba(255,255,255,0.9)" stroke="#d1d5db" stroke-width="1" rx="4"/>
  <text x="${width / 2}" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#374151">Recipients (325 clients)</text>
  
  <!-- Sample addresses grid -->
  <g>
    <rect x="70" y="290" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="75" y="305" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">NextGen Inc.</text>
    <text x="75" y="315" font-family="Arial, sans-serif" font-size="7" fill="#374151">3327 Oak St</text>
    <text x="75" y="323" font-family="Arial, sans-serif" font-size="7" fill="#374151">Springfield, PA 20068</text>
    
    <rect x="240" y="290" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="245" y="305" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">Olivia Clark</text>
    <text x="245" y="315" font-family="Arial, sans-serif" font-size="7" fill="#374151">8937 Sunset Blvd</text>
    <text x="245" y="323" font-family="Arial, sans-serif" font-size="7" fill="#374151">Springfield, OH 91718</text>
    
    <rect x="410" y="290" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="415" y="305" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">John Harris</text>
    <text x="415" y="315" font-family="Arial, sans-serif" font-size="7" fill="#374151">6067 Cedar Blvd</text>
    <text x="415" y="323" font-family="Arial, sans-serif" font-size="7" fill="#374151">Bristol, NY 38401</text>
    
    <rect x="70" y="335" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="75" y="350" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">John Taylor</text>
    <text x="75" y="360" font-family="Arial, sans-serif" font-size="7" fill="#374151">8088 Elm St</text>
    <text x="75" y="368" font-family="Arial, sans-serif" font-size="7" fill="#374151">Greenville, TX 50049</text>
    
    <rect x="240" y="335" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="245" y="350" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">Laura Lee</text>
    <text x="245" y="360" font-family="Arial, sans-serif" font-size="7" fill="#374151">7978 Cedar Blvd</text>
    <text x="245" y="368" font-family="Arial, sans-serif" font-size="7" fill="#374151">Bristol, NY 23733</text>
    
    <rect x="410" y="335" width="150" height="35" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="2"/>
    <text x="415" y="350" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#1f2937">+ 320 more clients</text>
    <text x="415" y="365" font-family="Arial, sans-serif" font-size="7" fill="#6b7280">View full list in order details</text>
  </g>
  
  <!-- Footer -->
  <text x="${width / 2}" y="440" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#374151">Order: ${filename.replace('_back.svg', '')} | 325 cards | 7" × 5.125"</text>
  <text x="${width / 2}" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">Generated: ${new Date().toLocaleDateString()}</text>
  <text x="${width / 2}" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" fill="#9ca3af">Professional Holiday Card Service</text>
</svg>`;
    } else {
      // Front card design
      svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <!-- White background -->
  <rect width="100%" height="100%" fill="white"/>
  
  <!-- Border -->
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#e5e7eb" stroke-width="2"/>
  
  <!-- Title -->
  <text x="${width / 2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#1e293b">Holiday Card</text>
  
  <!-- Filename -->
  <text x="${width / 2}" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#475569">${filename.replace('.svg', '')}</text>
  
  <!-- Decorative line -->
  <rect x="${width / 2 - 100}" y="100" width="200" height="3" fill="#3b82f6"/>
  
  <!-- Card dimensions -->
  <text x="${width / 2}" y="130" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">7" × 5.125" Holiday Card</text>
  
  <!-- Template preview area background -->
  <rect x="50" y="150" width="${width - 100}" height="${height - 200}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- Template preview placeholder -->
  <text x="${width / 2}" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#6b7280">Template Preview</text>
  <text x="${width / 2}" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">Merry Christmas Snowfall</text>
  
  <!-- Content lines to represent the card design -->
  <g>
    <rect x="80" y="250" width="180" height="8" fill="#e5e7eb"/>
    <rect x="80" y="270" width="220" height="8" fill="#e5e7eb"/>
    <rect x="80" y="290" width="160" height="8" fill="#e5e7eb"/>
    <rect x="80" y="310" width="200" height="8" fill="#e5e7eb"/>
    <rect x="320" y="250" width="150" height="8" fill="#e5e7eb"/>
    <rect x="320" y="270" width="190" height="8" fill="#e5e7eb"/>
    <rect x="320" y="290" width="170" height="8" fill="#e5e7eb"/>
    <rect x="320" y="310" width="180" height="8" fill="#e5e7eb"/>
  </g>
  
  <!-- Snowflake decorations -->
  <g fill="#3b82f6" opacity="0.3">
    <text x="150" y="360" font-family="Arial, sans-serif" font-size="20">❄</text>
    <text x="400" y="340" font-family="Arial, sans-serif" font-size="16">❄</text>
    <text x="500" y="380" font-family="Arial, sans-serif" font-size="18">❄</text>
    <text x="120" y="380" font-family="Arial, sans-serif" font-size="14">❄</text>
  </g>
  
  <!-- Generation info -->
  <text x="${width / 2}" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#9ca3af">Generated: ${new Date().toLocaleDateString()}</text>
  <text x="${width / 2}" y="465" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af">Professional Holiday Card Front</text>
</svg>`;
    }
    
    // Convert SVG string to Uint8Array
    const svgBytes = new TextEncoder().encode(svg);
    
    console.log('Generated SVG size:', svgBytes.length, 'bytes');
    return svgBytes;
    
  } catch (error) {
    console.error('Error generating SVG:', error);
    
    // Fallback: Create a simple SVG
    const fallbackSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="#ddd" stroke-width="2"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#333">Holiday Card</text>
  <text x="${width / 2}" y="${height / 2 + 30}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">${filename.replace('.svg', '')}</text>
</svg>`;
    
    return new TextEncoder().encode(fallbackSvg);
  }
}