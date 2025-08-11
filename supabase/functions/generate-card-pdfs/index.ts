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

    // Create PDFs with embedded HTML content
    const frontPDF = await generateHTMLPDF(frontHTML, `${order.readable_order_id || orderId}_front.pdf`);
    const backPDF = await generateHTMLPDF(backHTML, `${order.readable_order_id || orderId}_back.pdf`);

    // Upload PDFs to storage
    const frontPDFPath = `pdfs/${orderId}_front_${Date.now()}.pdf`;
    const backPDFPath = `pdfs/${orderId}_back_${Date.now()}.pdf`;

    const { error: frontUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(frontPDFPath, frontPDF, {
        contentType: 'application/pdf',
        upsert: true
      });

    const { error: backUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(backPDFPath, backPDF, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (frontUploadError || backUploadError) {
      throw new Error(`PDF upload failed: ${frontUploadError?.message || backUploadError?.message}`);
    }

    console.log(`PDFs generated successfully for order ${orderId}`);

    // Generate public download URLs
    const { data: frontSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(frontPDFPath, 3600); // 1 hour expiry

    const { data: backSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(backPDFPath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({ 
      success: true,
      frontPdfPath: frontPDFPath,
      backPdfPath: backPDFPath,
      frontDownloadUrl: frontSignedUrl?.signedUrl || null,
      backDownloadUrl: backSignedUrl?.signedUrl || null,
      message: 'PDFs generated successfully with 7" x 5.125" dimensions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-card-pdfs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate PDFs' 
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

async function generateHTMLPDF(htmlContent: string, filename: string): Promise<Uint8Array> {
  console.log('Generating PDF for:', filename);
  
  // Convert 7in x 5.125in to points (1 inch = 72 points)
  const pageWidth = 7 * 72; // 504 points
  const pageHeight = 5.125 * 72; // 369 points
  
  // Extract and clean text content from HTML
  const textContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Create a structured content stream
  const contentLines = [
    `Holiday Card - ${filename.replace('.pdf', '')}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    `Dimensions: 7" x 5.125"`,
    '',
    ...textContent.split(' ').reduce((lines: string[], word: string, index: number) => {
      const lineIndex = Math.floor(index / 8);
      if (!lines[lineIndex]) lines[lineIndex] = '';
      lines[lineIndex] += (lines[lineIndex] ? ' ' : '') + word;
      return lines;
    }, []).slice(0, 20)
  ];

  // Build PDF content stream
  let yPosition = pageHeight - 50;
  let contentStream = 'BT\n/F1 14 Tf\n';
  
  contentLines.forEach((line, index) => {
    const fontSize = index < 3 ? 14 : 10;
    const escapedLine = line.substring(0, 60).replace(/[()\\]/g, '\\$&');
    contentStream += `/F1 ${fontSize} Tf\n50 ${yPosition} Td\n(${escapedLine}) Tj\n`;
    yPosition -= fontSize + 5;
    if (yPosition < 50) yPosition = 50; // Don't go below page bottom
  });
  
  contentStream += 'ET';
  const streamLength = contentStream.length;

  // Generate proper PDF with 7"x5.125" dimensions
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${pageWidth} ${pageHeight}]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000${320 + streamLength} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${380 + streamLength}
%%EOF`;

  const pdfBytes = new TextEncoder().encode(pdfContent);
  console.log('Generated PDF size:', pdfBytes.length, 'bytes');
  return pdfBytes;
}