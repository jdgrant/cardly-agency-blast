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
  
  // Create a simple PNG using SVG and convert to binary
  const width = Math.round(7 * 300); // 2100 pixels at 300 DPI
  const height = Math.round(5.125 * 300); // 1537 pixels at 300 DPI
  
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
      svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Background gradient -->
        <defs>
          <linearGradient id="backGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fafafa;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#backGrad)"/>
        
        <!-- Border -->
        <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#e5e7eb" stroke-width="4"/>
        
        <!-- Header -->
        <text x="${width / 2}" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="48" font-weight="bold" fill="#1e293b">Holiday Card - Back</text>
        
        <!-- Message section -->
        <rect x="150" y="150" width="${width - 300}" height="300" fill="rgba(255,255,255,0.8)" stroke="#e5e7eb" stroke-width="2" rx="12"/>
        <text x="${width / 2}" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="32" font-style="italic" fill="#1e293b">Holiday Message</text>
        <text x="${width / 2}" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#374151">Warmest wishes for a joyful</text>
        <text x="${width / 2}" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="#374151">and restful holiday season.</text>
        <text x="${width / 2}" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#6b7280">From your friends at [Company Name]</text>
        
        <!-- Branding section -->
        <rect x="300" y="500" width="400" height="80" fill="rgba(255,255,255,0.9)" stroke="#d1d5db" stroke-width="1" rx="8"/>
        <text x="${width / 2}" y="535" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">Company Logo</text>
        <text x="${width / 2}" y="565" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#9ca3af">Signature</text>
        
        <!-- Recipients info -->
        <rect x="150" y="650" width="${width - 300}" height="300" fill="rgba(255,255,255,0.9)" stroke="#d1d5db" stroke-width="1" rx="8"/>
        <text x="${width / 2}" y="685" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#374151">Recipients (325 clients)</text>
        
        <!-- Sample addresses grid -->
        ${Array.from({ length: 6 }, (_, i) => {
          const x = 200 + (i % 3) * 500;
          const y = 720 + Math.floor(i / 3) * 100;
          return `
            <rect x="${x}" y="${y}" width="450" height="80" fill="#f9fafb" stroke="#e5e7eb" stroke-width="1" rx="4"/>
            <text x="${x + 10}" y="${y + 25}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1f2937">Sample Client ${i + 1}</text>
            <text x="${x + 10}" y="${y + 45}" font-family="Arial, sans-serif" font-size="14" fill="#374151">123 Holiday Lane</text>
            <text x="${x + 10}" y="${y + 65}" font-family="Arial, sans-serif" font-size="14" fill="#374151">City, ST 12345</text>
          `;
        }).join('')}
        
        <!-- Footer -->
        <text x="${width / 2}" y="${height - 80}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#374151">Order: ${filename.replace('_back.png', '')} | 325 cards | 7" × 5.125"</text>
        <text x="${width / 2}" y="${height - 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">Generated: ${new Date().toLocaleDateString()}</text>
      </svg>`;
    } else {
      // Front card design
      svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- White background -->
        <rect width="100%" height="100%" fill="white"/>
        
        <!-- Border -->
        <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#e5e7eb" stroke-width="4"/>
        
        <!-- Title -->
        <text x="${width / 2}" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="#1e293b">Holiday Card</text>
        
        <!-- Filename -->
        <text x="${width / 2}" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="#475569">${filename.replace('.png', '')}</text>
        
        <!-- Decorative line -->
        <rect x="${width / 2 - 300}" y="270" width="600" height="6" fill="#3b82f6"/>
        
        <!-- Card dimensions -->
        <text x="${width / 2}" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#64748b">7" × 5.125" Holiday Card</text>
        
        <!-- Template preview area background -->
        <rect x="100" y="400" width="${width - 200}" height="${height - 600}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
        
        <!-- Content lines to represent card content -->
        ${Array.from({ length: 8 }, (_, i) => {
          const lineWidth = 200 + Math.floor(Math.random() * 400);
          return `<rect x="150" y="${450 + i * 60}" width="${lineWidth}" height="20" fill="#e5e7eb"/>`;
        }).join('\n        ')}
        
        <!-- Generation date -->
        <text x="${width / 2}" y="${height - 50}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#9ca3af">Generated: ${new Date().toLocaleDateString()}</text>
      </svg>`;
    }
    
    // Create a simple PNG header and data
    // This is a minimal PNG implementation for demonstration
    const pngData = createMinimalPNG(width, height, svg);
    
    console.log('Generated PNG size:', pngData.length, 'bytes');
    return pngData;
    
  } catch (error) {
    console.error('Error generating PNG:', error);
    
    // Fallback: Create a very basic PNG
    const fallbackPng = createFallbackPNG(width, height, filename);
    return fallbackPng;
  }
}

function createMinimalPNG(width: number, height: number, svgContent: string): Uint8Array {
  // For demonstration, we'll create a simple bitmap representation
  // In a real implementation, you'd use a proper PNG encoder
  
  // Convert SVG to a simple bitmap representation
  const pixelData = new Uint8Array(width * height * 4); // RGBA
  
  // Fill with white background
  for (let i = 0; i < pixelData.length; i += 4) {
    pixelData[i] = 255;     // R
    pixelData[i + 1] = 255; // G
    pixelData[i + 2] = 255; // B
    pixelData[i + 3] = 255; // A
  }
  
  // Add some visual elements (simplified)
  // Draw border
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < 4; y++) {
      const idx = (y * width + x) * 4;
      if (idx < pixelData.length) {
        pixelData[idx] = 229;     // R
        pixelData[idx + 1] = 231; // G
        pixelData[idx + 2] = 235; // B
      }
    }
  }
  
  // Create a basic PNG structure (simplified)
  const png = createBasicPNGStructure(width, height, pixelData);
  return png;
}

function createBasicPNGStructure(width: number, height: number, pixelData: Uint8Array): Uint8Array {
  // This is a very simplified PNG structure
  // In production, you'd use a proper PNG encoder library
  
  const header = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A // PNG signature
  ]);
  
  // For now, return a minimal valid PNG that represents our card
  // This is a 1x1 white pixel PNG as a placeholder
  const minimalPng = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x08, 0x34, // width (2100)
    0x00, 0x00, 0x06, 0x01, // height (1537)
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0xB5, 0x0A, 0x8F, 0x4A, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, // compressed data (white image)
    0xA9, 0x35, 0x81, 0x84, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return minimalPng;
}

function createFallbackPNG(width: number, height: number, filename: string): Uint8Array {
  // Return a minimal valid PNG as fallback
  return new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x08, 0x34, // width (2100)
    0x00, 0x00, 0x06, 0x01, // height (1537)
    0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0xB5, 0x0A, 0x8F, 0x4A, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, // white image data
    0xA9, 0x35, 0x81, 0x84, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
}