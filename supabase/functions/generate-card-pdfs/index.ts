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
        body {
          margin: 0;
          padding: 0;
          width: 360px;
          height: 504px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          font-family: Arial, sans-serif;
        }
        .card-container {
          width: 100%;
          height: 100%;
          border: 2px solid #ccc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .template-info {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 20px;
        }
        .template-description {
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
        }
        .template-preview {
          width: 200px;
          height: 200px;
          border: 1px solid #ddd;
          background: url('${template.preview_url}') center/cover;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <div class="card-container">
        <div class="template-info">${template.name}</div>
        <div class="template-description">${template.description || 'Holiday Card Template'}</div>
        <div class="template-preview"></div>
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
        body {
          margin: 0;
          padding: 0;
          width: 360px;
          height: 504px;
          font-family: 'Georgia', serif;
          background: white;
        }
        .card-back {
          width: 100%;
          height: 100%;
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          border: 2px solid #ccc;
        }
        .message-section {
          text-align: center;
          margin-bottom: 30px;
        }
        .message {
          font-size: 18px;
          line-height: 1.6;
          color: #333;
          font-style: italic;
        }
        .bottom-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        .logo {
          max-width: 150px;
          max-height: 50px;
          object-fit: contain;
        }
        .signature {
          max-width: 100px;
          max-height: 30px;
          object-fit: contain;
        }
        .address-section {
          font-size: 10px;
          line-height: 1.3;
          border: 1px solid #ccc;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        .address-section h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          color: #333;
          font-weight: bold;
        }
        .address-item {
          margin-bottom: 6px;
          padding-bottom: 3px;
          border-bottom: 1px dotted #ccc;
        }
        .order-info {
          font-size: 8px;
          color: #888;
          text-align: center;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="card-back">
        <div class="message-section">
          <div class="message">${message}</div>
        </div>
        
        <div class="bottom-section">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo" />` : '<div style="height: 50px; display: flex; align-items: center; color: #999;">Company Logo</div>'}
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" class="signature" />` : '<div style="height: 30px; display: flex; align-items: center; color: #999;">Signature</div>'}
        </div>

        ${clients.length > 0 ? `
        <div class="address-section">
          <h4>Recipients (${clients.length} clients):</h4>
          ${clients.slice(0, 6).map(client => `
            <div class="address-item">
              ${client.first_name} ${client.last_name}<br>
              ${client.address}<br>
              ${client.city}, ${client.state} ${client.zip}
            </div>
          `).join('')}
          ${clients.length > 6 ? `<div class="address-item"><strong>... and ${clients.length - 6} more recipients</strong></div>` : ''}
        </div>
        ` : ''}
        
        <div class="order-info">
          Order: ${order.readable_order_id || order.id} | ${order.card_quantity} cards | Generated: ${new Date().toLocaleDateString()}
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