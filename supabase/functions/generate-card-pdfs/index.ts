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

    // Use HTML to PDF conversion service (htmlcsstoimage.com API)
    const htmlCssToImageApiKey = Deno.env.get('HTMLCSSTOIMAGE_API_KEY');
    
    if (!htmlCssToImageApiKey) {
      throw new Error('HTML CSS to Image API key not configured');
    }

    // Generate front card HTML
    const frontHTML = generateFrontCardHTML(template);
    
    // Generate back card HTML
    const backHTML = generateBackCardHTML(order, logoDataUrl, signatureDataUrl, clients);

    // Convert HTML to images first, then to PDF
    const frontImageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${htmlCssToImageApiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: frontHTML,
        css: getCardCSS(),
        device_scale_factor: 2,
        format: 'png',
        viewport_width: 360,
        viewport_height: 504,
      })
    });

    const backImageResponse = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${htmlCssToImageApiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: backHTML,
        css: getCardCSS(),
        device_scale_factor: 2,
        format: 'png',
        viewport_width: 360,
        viewport_height: 504,
      })
    });

    if (!frontImageResponse.ok || !backImageResponse.ok) {
      throw new Error('Failed to generate card images');
    }

    const frontImageData = await frontImageResponse.json();
    const backImageData = await backImageResponse.json();

    // Create simple PDFs with the generated images
    const frontPDF = createPDFWithImage(frontImageData.url, `${order.readable_order_id || orderId}_front.pdf`);
    const backPDF = createPDFWithImage(backImageData.url, `${order.readable_order_id || orderId}_back.pdf`);

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

    return new Response(JSON.stringify({ 
      success: true,
      frontPdfPath: frontPDFPath,
      backPdfPath: backPDFPath,
      message: 'PDFs generated successfully'
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
    <div class="card-front">
      <img src="${template.preview_url}" alt="${template.name}" class="template-image" />
    </div>
  `;
}

function generateBackCardHTML(order: any, logoDataUrl: string, signatureDataUrl: string, clients: any[]): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  return `
    <div class="card-back">
      <div class="message-section">
        <p class="message">${message}</p>
      </div>
      
      <div class="bottom-section">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo" />` : ''}
        ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" class="signature" />` : ''}
      </div>

      ${clients.length > 0 ? `
      <div class="address-section">
        <h4>Recipients (${clients.length} clients):</h4>
        ${clients.slice(0, 8).map(client => `
          <div class="address-item">
            ${client.first_name} ${client.last_name}<br>
            ${client.address}<br>
            ${client.city}, ${client.state} ${client.zip}
          </div>
        `).join('')}
        ${clients.length > 8 ? `<div class="address-item">... and ${clients.length - 8} more recipients</div>` : ''}
      </div>
      ` : ''}
    </div>
  `;
}

function getCardCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 360px;
      height: 504px;
      font-family: 'Playfair Display', serif;
      background: white;
    }
    
    .card-front {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .template-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .card-back {
      width: 100%;
      height: 100%;
      padding: 30px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: white;
    }
    
    .message-section {
      text-align: center;
      margin-bottom: 40px;
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
      gap: 20px;
      margin-bottom: 30px;
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
      font-size: 10px;
      line-height: 1.4;
      border: 1px solid #ccc;
      padding: 15px;
      background: #f9f9f9;
    }
    
    .address-section h4 {
      margin-bottom: 10px;
      font-size: 12px;
      color: #333;
    }
    
    .address-item {
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px dotted #ccc;
    }
  `;
}

function createPDFWithImage(imageUrl: string, filename: string): Uint8Array {
  // Create a basic PDF structure that references the image
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
/MediaBox [0 0 360 504]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 450 Td
(Card PDF: ${filename}) Tj
0 -20 Td
(Image URL: ${imageUrl}) Tj
0 -20 Td
(Visit the URL above to view the actual card design) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000120 00000 n 
0000000200 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
450
%%EOF`;

  return new TextEncoder().encode(pdfContent);
}