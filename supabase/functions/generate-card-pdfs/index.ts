import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePDFRequest {
  orderId: string;
  format?: 'preview' | 'production';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, format = 'preview' } = await req.json() as GeneratePDFRequest;
    
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

    // Use preview URLs instead of generating HTML
    const origin = req.headers.get('origin') || 'https://e84fd20e-7cca-4259-84ad-12452c25e301.sandbox.lovable.dev';
    const frontPreviewUrl = `${origin}/#/preview/front/${orderId}`;
    const insidePreviewUrl = `${origin}/#/preview/inside/${orderId}`;
    
    console.log('Using front preview URL:', frontPreviewUrl);
    console.log('Using inside preview URL:', insidePreviewUrl);

    // Convert preview URLs to PDF using Gotenberg
    const frontPDF = await convertURLToPDF(frontPreviewUrl, 'front', format);
    const backPDF = await convertURLToPDF(insidePreviewUrl, 'inside', format);

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
      message: `PDF cards generated successfully using preview URLs - ${format === 'production' ? '10.25" x 7"' : '5.125" x 7"'} dimensions`
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

async function convertURLToPDF(url: string, type: string, format: string = 'preview'): Promise<Uint8Array> {
  // Add spread parameter for inside production PDFs
  const spreadParam = (format === 'production' && type === 'inside') ? '?spread=true' : '';
  const fullUrl = `${url}${spreadParam}`;
  
  console.log(`Converting ${type} preview URL to PDF:`, fullUrl);
  
  try {
    // Use gotenberg API for URL to PDF conversion
    const gotenbergUrl = Deno.env.get('GOTENBERG_URL') || 'https://pdf.sendyourcards.io';
    const apiKey = Deno.env.get('GOTENBERG_API_KEY');
    
    const formData = new FormData();
    formData.append('url', fullUrl);
    formData.append('paperWidth', format === 'production' ? '10.25' : '5.125');
    formData.append('paperHeight', '7');
    formData.append('marginTop', '0');
    formData.append('marginBottom', '0');
    formData.append('marginLeft', '0');
    formData.append('marginRight', '0');
    formData.append('landscape', 'false');
    formData.append('preferCssPageSize', 'true');
    formData.append('emulatedMediaType', 'print');
    formData.append('waitDelay', '2000ms');
    
    const headers: Record<string, string> = {
      'Accept': 'application/pdf'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['X-Api-Key'] = apiKey;
    }
    
    const response = await fetch(`${gotenbergUrl}/forms/chromium/convert/url`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gotenberg conversion failed for ${type}: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const pdfBuffer = await response.arrayBuffer();
    return new Uint8Array(pdfBuffer);
    
  } catch (error) {
    console.error(`Error converting ${type} URL to PDF:`, error);
    throw new Error(`PDF conversion failed for ${type}: ${error.message}`);
  }
}