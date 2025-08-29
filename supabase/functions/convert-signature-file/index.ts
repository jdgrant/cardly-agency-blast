import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, fileName, fileType } = await req.json();
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Converting signature file: ${fileName} (${fileType})`);

    // Handle different file types
    if (fileType === 'application/pdf') {
      return await convertPdfToImage(file, fileName);
    } else if (fileType.startsWith('image/')) {
      return await processImageFile(file, fileName, fileType);
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error converting signature file:', error);
    
    return new Response(JSON.stringify({ 
      error: 'File conversion failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processImageFile(file: string, fileName: string, fileType: string): Promise<Response> {
  try {
    console.log(`Processing image file: ${fileName}`);
    
    // For images, we can return them directly as they're already in a croppable format
    // The client can handle PNG, JPEG directly
    const response = {
      success: true,
      imageData: `data:${fileType};base64,${file}`,
      fileName: fileName,
      originalFormat: fileType,
      convertedFormat: fileType,
      width: null, // Client will determine dimensions
      height: null
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing image file:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

async function convertPdfToImage(file: string, fileName: string): Promise<Response> {
  try {
    console.log(`Converting PDF to image: ${fileName}`);

    // Get Gotenberg configuration
    const GOTENBERG_URL = Deno.env.get('GOTENBERG_URL');
    const GOTENBERG_API_KEY = Deno.env.get('GOTENBERG_API_KEY');

    console.log('Gotenberg URL:', GOTENBERG_URL);
    console.log('API Key configured:', !!GOTENBERG_API_KEY);

    if (!GOTENBERG_URL || !GOTENBERG_API_KEY) {
      throw new Error('Gotenberg service is not configured. PDF conversion requires Gotenberg to be set up.');
    }

    // Decode the base64 PDF file
    const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    // Verify it's a valid PDF
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 8));
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file format');
    }

    console.log('Attempting real PDF conversion via Gotenberg');
    
    // Use the basic PDF conversion endpoint
    const form = new FormData();
    const pdfFile = new File([pdfBytes], fileName, { type: 'application/pdf' });
    form.append('files', pdfFile);
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${GOTENBERG_API_KEY}`
    };

    const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/pdfengines/convert`;
    console.log('Calling Gotenberg at:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: form
    });

    console.log('Gotenberg response status:', response.status);
    console.log('Gotenberg response content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gotenberg error response:', errorText);
      throw new Error(`Gotenberg conversion failed (${response.status}): ${errorText}`);
    }

    // Get the converted image
    const imageArrayBuffer = await response.arrayBuffer();
    
    if (imageArrayBuffer.byteLength === 0) {
      throw new Error('Gotenberg returned empty response');
    }
    
    const imageBytes = new Uint8Array(imageArrayBuffer);
    console.log('Received image data, size:', imageBytes.length, 'bytes');
    
    // Convert to base64
    const base64String = btoa(String.fromCharCode(...imageBytes));
    const imageData = `data:image/png;base64,${base64String}`;
    
    console.log('PDF successfully converted to real image via Gotenberg');
    
    const result = {
      success: true,
      imageData: imageData,
      fileName: fileName.replace('.pdf', '.png'),
      originalFormat: 'application/pdf',
      convertedFormat: 'image/png',
      width: null,
      height: null
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PDF conversion failed:', error);
    throw error; // Let the actual error bubble up - no fake images
  }
}
