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
    let logoBlob: ArrayBuffer | null = null;
    let signatureBlob: ArrayBuffer | null = null;

    if (order.logo_url) {
      try {
        const { data: logoData } = await supabase.storage
          .from('holiday-cards')
          .download(order.logo_url);
        if (logoData) {
          logoBlob = await logoData.arrayBuffer();
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
          signatureBlob = await signatureData.arrayBuffer();
        }
      } catch (error) {
        console.error('Error downloading signature:', error);
      }
    }

    // Generate PDF content using HTML/CSS
    const frontPageHTML = generateFrontPageHTML(template, order);
    const backPageHTML = generateBackPageHTML(order, logoBlob, signatureBlob, clients);

    // Convert HTML to PDF using a simple approach
    // Note: In a production environment, you might want to use a more robust PDF generation library
    const frontPDF = await generateSimplePDF(frontPageHTML, `${order.readable_order_id || orderId}_front.pdf`);
    const backPDF = await generateSimplePDF(backPageHTML, `${order.readable_order_id || orderId}_back.pdf`);

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

function generateFrontPageHTML(template: any, order: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 5in 7in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 5in;
          height: 7in;
          background-image: url('${template.preview_url}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          font-family: Arial, sans-serif;
        }
        .content {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <!-- Template image serves as background -->
      </div>
    </body>
    </html>
  `;
}

function generateBackPageHTML(order: any, logoBlob: ArrayBuffer | null, signatureBlob: ArrayBuffer | null, clients: any[]): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  // Convert binary data to base64 for embedding in HTML
  let logoDataUrl = '';
  let signatureDataUrl = '';
  
  if (logoBlob) {
    const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBlob)));
    logoDataUrl = `data:image/png;base64,${logoBase64}`;
  }
  
  if (signatureBlob) {
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBlob)));
    signatureDataUrl = `data:image/png;base64,${signatureBase64}`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 5in 7in;
          margin: 0.5in;
        }
        body {
          margin: 0;
          padding: 0;
          width: 4in;
          height: 6in;
          font-family: 'Playfair Display', serif;
          background: white;
        }
        .content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          box-sizing: border-box;
        }
        .message {
          text-align: center;
          font-size: 16px;
          line-height: 1.6;
          color: #333;
          margin-bottom: 40px;
        }
        .bottom-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .logo {
          max-width: 200px;
          max-height: 80px;
          object-fit: contain;
        }
        .signature {
          max-width: 150px;
          max-height: 60px;
          object-fit: contain;
        }
        .address-block {
          margin-top: 40px;
          border: 1px solid #ccc;
          padding: 10px;
          font-size: 12px;
          width: 100%;
        }
        .address-item {
          margin-bottom: 8px;
          border-bottom: 1px dotted #ccc;
          padding-bottom: 4px;
        }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="message">
          ${message}
        </div>
        
        <div class="bottom-section">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" class="logo" />` : ''}
          ${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="Signature" class="signature" />` : ''}
        </div>

        ${clients.length > 0 ? `
        <div class="address-block">
          <strong>Recipients (${clients.length} clients):</strong>
          ${clients.slice(0, 10).map(client => `
            <div class="address-item">
              ${client.first_name} ${client.last_name}<br>
              ${client.address}<br>
              ${client.city}, ${client.state} ${client.zip}
            </div>
          `).join('')}
          ${clients.length > 10 ? `<div class="address-item">... and ${clients.length - 10} more recipients</div>` : ''}
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

async function generateSimplePDF(htmlContent: string, filename: string): Promise<Uint8Array> {
  // This is a simplified PDF generation approach
  // In production, you would use a proper HTML-to-PDF service or library
  
  // For now, we'll create a simple text-based PDF structure
  const pdfHeader = `%PDF-1.4
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
/Length ${htmlContent.length + 50}
>>
stream
BT
/F1 12 Tf
50 450 Td
(Generated PDF for ${filename}) Tj
0 -20 Td
(Content: HTML-based card design) Tj
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
${300 + htmlContent.length}
%%EOF`;

  return new TextEncoder().encode(pdfHeader);
}