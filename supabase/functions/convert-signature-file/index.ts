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
    const GOTENBERG_URL = Deno.env.get('GOTENBERG_URL') || 'https://pdf.sendyourcards.io';
    const GOTENBERG_API_KEY = Deno.env.get('GOTENBERG_API_KEY');

    console.log('Gotenberg URL:', GOTENBERG_URL);
    console.log('API Key configured:', !!GOTENBERG_API_KEY);

    if (!GOTENBERG_URL || !GOTENBERG_API_KEY) {
      throw new Error('Gotenberg service is not configured. Cannot convert PDF files.');
    }

    try {
      // Decode the base64 PDF file
      const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      
      // Use Gotenberg Chromium conversion (more reliable for PDFs)
      const form = new FormData();
      
      // Create HTML that embeds the PDF for Chromium to screenshot
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
      const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; }
          embed { width: 100%; height: 100%; border: none; }
        </style>
      </head>
      <body>
        <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
      </body>
      </html>`;
      
      form.append('files', new File([htmlContent], 'index.html', { type: 'text/html' }));
      form.append('paperWidth', '8.5');
      form.append('paperHeight', '11');
      form.append('marginTop', '0');
      form.append('marginBottom', '0');
      form.append('marginLeft', '0');
      form.append('marginRight', '0');
      form.append('landscape', 'false');
      form.append('format', 'png');
      
      const headers: Record<string, string> = {};
      if (GOTENBERG_API_KEY) {
        headers['Authorization'] = `Bearer ${GOTENBERG_API_KEY}`;
        headers['X-Api-Key'] = GOTENBERG_API_KEY;
      }

      // Use Chromium screenshot endpoint (more reliable for PDF rendering)
      const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/chromium/screenshot`;
      console.log('Calling Gotenberg Chromium screenshot for PDF at:', url);
      
      const gotenbergResp = await fetch(url, {
        method: 'POST',
        headers,
        body: form as any
      });

      console.log('Gotenberg response status:', gotenbergResp.status);
      
      if (!gotenbergResp.ok) {
        const errText = await gotenbergResp.text();
        console.error('Gotenberg error response:', errText);
        throw new Error(`Gotenberg conversion failed: ${errText}`);
      }

      // Get the PNG data from Gotenberg
      const imageArrayBuffer = await gotenbergResp.arrayBuffer();
      const imageBytes = new Uint8Array(imageArrayBuffer);
      
      // Convert to base64
      const base64String = btoa(String.fromCharCode(...imageBytes));
      const imageData = `data:image/png;base64,${base64String}`;
      
      console.log('PDF successfully converted to PNG using Gotenberg');
      
      const response = {
        success: true,
        imageData: imageData,
        fileName: fileName.replace('.pdf', '.png'),
        originalFormat: 'application/pdf',
        convertedFormat: 'image/png',
        width: null, // Client will determine dimensions
        height: null
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (gotenbergError) {
      console.error('Gotenberg conversion failed:', gotenbergError);
      throw new Error(`PDF conversion failed: ${gotenbergError.message}`);
    }

  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}
