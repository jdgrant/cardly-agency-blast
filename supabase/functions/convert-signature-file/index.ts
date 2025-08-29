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
      console.log('Gotenberg not configured, using SVG fallback');
      return createPdfPlaceholder(fileName);
    }

    try {
      // Decode the base64 PDF file
      const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      
      // Use Gotenberg PDF conversion directly
      const form = new FormData();
      const pdfFile = new File([pdfBytes], fileName, { type: 'application/pdf' });
      form.append('files', pdfFile);
      
      // Convert PDF to PNG with high quality
      form.append('quality', '100');
      form.append('format', 'png');
      
      const headers: Record<string, string> = {};
      if (GOTENBERG_API_KEY) {
        headers['Authorization'] = `Bearer ${GOTENBERG_API_KEY}`;
        headers['X-Api-Key'] = GOTENBERG_API_KEY;
      }

      // Use the PDF engines convert endpoint
      const url = `${GOTENBERG_URL.replace(/\/$/, '')}/forms/pdfengines/convert`;
      console.log('Calling Gotenberg PDF conversion at:', url);
      
      const gotenbergResp = await fetch(url, {
        method: 'POST',
        headers,
        body: form as any
      });

      console.log('Gotenberg response status:', gotenbergResp.status);
      
      if (!gotenbergResp.ok) {
        const errText = await gotenbergResp.text();
        console.error('Gotenberg error response:', errText);
        console.log('Falling back to SVG placeholder');
        return createPdfPlaceholder(fileName);
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
      console.log('Falling back to SVG placeholder');
      return createPdfPlaceholder(fileName);
    }

  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

function createPdfPlaceholder(fileName: string): Response {
  console.log('Creating PDF placeholder for cropping');
  
  // Create a clean SVG placeholder that can be cropped
  const width = 800;
  const height = 600;
  const cleanFileName = fileName.replace(/[^\w\-_.]/g, '').substring(0, 40);
  
  const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="white" stroke="#e0e0e0" stroke-width="2"/>
    <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5"/>
    <rect x="60" y="80" width="${width-120}" height="${height-160}" fill="white" stroke="#ccc" stroke-width="2" rx="8"/>
    <text x="${width/2}" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">
      PDF Document
    </text>
    <text x="${width/2}" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666">
      ${cleanFileName}
    </text>
    <text x="${width/2}" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#888">
      Use the crop tool to select your signature area
    </text>
    <text x="${width/2}" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#aaa">
      This placeholder represents your PDF content
    </text>
    <rect x="200" y="380" width="400" height="80" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="4"/>
    <text x="${width/2}" y="410" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#555">
      Signature Area Example
    </text>
    <text x="${width/2}" y="430" text-anchor="middle" font-family="cursive" font-size="18" fill="#333">
      Your Name Here
    </text>
  </svg>`;
  
  const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
  const imageData = `data:image/svg+xml;base64,${base64Svg}`;
  
  const response = {
    success: true,
    imageData: imageData,
    fileName: fileName.replace('.pdf', '.svg'),
    originalFormat: 'application/pdf',
    convertedFormat: 'image/svg+xml',
    width: width,
    height: height,
    isPdfPlaceholder: true
  };

  console.log('PDF placeholder created successfully');
  
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}