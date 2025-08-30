import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { getSignatureUrl, getLogoUrl } from "../_shared/signature-utils.ts";
import { downloadAndEncodeImage } from "../_shared/image-utils.ts";
import { generateBackCardHTML } from "../_shared/pdf-layouts.ts";

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

    // Download logo and signature files using shared utilities
    const logoUrl = getLogoUrl(order);
    const signatureUrl = getSignatureUrl(order);
    
    const logoDataUrl = logoUrl ? await downloadAndEncodeImage(supabase, logoUrl) || '' : '';
    const signatureDataUrl = signatureUrl ? await downloadAndEncodeImage(supabase, signatureUrl) || '' : '';

    // Generate HTML content for cards using shared layout
    const frontHTML = generateFrontCardHTML(template);
    const backHTML = generateBackCardHTML(order, logoDataUrl, signatureDataUrl);
    
    console.log('Using signature URL:', signatureUrl);
    console.log('Signature data URL available:', !!signatureDataUrl);

    // Convert HTML to PDF using the actual HTML content with signatures
    const frontPDF = await convertHTMLToPDF(frontHTML);
    const backPDF = await convertHTMLToPDF(backHTML);

    // Upload PDFs to storage
    const frontPDFPath = `cards/${orderId}_front_${Date.now()}.pdf`;
    const backPDFPath = `cards/${orderId}_back_${Date.now()}.pdf`;

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

    console.log(`PDF cards generated successfully for order ${orderId}`);

    // Generate public download URLs
    const { data: frontSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(frontPDFPath, 3600); // 1 hour expiry

    const { data: backSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(backPDFPath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({ 
      success: true,
      frontImagePath: frontPDFPath,
      backImagePath: backPDFPath,
      frontDownloadUrl: frontSignedUrl?.signedUrl || null,
      backDownloadUrl: backSignedUrl?.signedUrl || null,
      message: 'PDF cards generated successfully with 7" x 5.125" dimensions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-card-pdfs function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate PDF cards' 
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

async function convertHTMLToPDF(htmlContent: string): Promise<Uint8Array> {
  console.log('Converting HTML to PDF');
  
  try {
    // Use gotenberg API for HTML to PDF conversion
    const gotenbergUrl = Deno.env.get('GOTENBERG_URL') || 'https://pdf.sendyourcards.io';
    const apiKey = Deno.env.get('GOTENBERG_API_KEY');
    
    const formData = new FormData();
    formData.append('files', new Blob([htmlContent], { type: 'text/html' }), 'index.html');
    
    const headers: Record<string, string> = {
      'Accept': 'application/pdf'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Gotenberg conversion failed: ${response.status} ${response.statusText}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    return new Uint8Array(pdfBuffer);
    
  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}