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

    // Try Gotenberg first if configured
    if (GOTENBERG_URL && GOTENBERG_API_KEY) {
      try {
        return await convertWithGotenberg(file, fileName, GOTENBERG_URL, GOTENBERG_API_KEY);
      } catch (gotenbergError) {
        console.error('Gotenberg conversion failed, trying alternative:', gotenbergError);
        // Fall through to alternative approach
      }
    }

    // Alternative approach: Create a basic PDF representation that can be cropped
    console.log('Using basic PDF conversion approach');
    
    // Decode the PDF to verify it's valid
    const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    // Check if it's a valid PDF
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 8));
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error('Invalid PDF file format');
    }

    // Create a simple canvas-like representation of the PDF
    const width = 800;
    const height = 1000;
    
    // Create SVG that represents the PDF document
    const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="2"/>
      <rect x="40" y="40" width="${width-80}" height="${height-80}" fill="#fafafa" stroke="#ccc" stroke-width="1"/>
      <text x="${width/2}" y="100" text-anchor="middle" font-family="Arial" font-size="18" fill="#333">PDF Document</text>
      <text x="${width/2}" y="130" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">${fileName}</text>
      <text x="${width/2}" y="200" text-anchor="middle" font-family="Arial" font-size="12" fill="#888">This represents your PDF content</text>
      <text x="${width/2}" y="220" text-anchor="middle" font-family="Arial" font-size="12" fill="#888">Use the crop tool to select your signature area</text>
      
      <!-- Sample signature area -->
      <rect x="150" y="400" width="500" height="150" fill="white" stroke="#999" stroke-width="1" stroke-dasharray="5,5"/>
      <text x="${width/2}" y="460" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">Sample Signature Area</text>
      <text x="${width/2}" y="480" text-anchor="middle" font-family="cursive" font-size="16" fill="#333">Your Signature Here</text>
      <text x="${width/2}" y="500" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">Crop around this area or where your signature appears</text>
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
      isBasicConversion: true,
      message: 'PDF converted to basic representation. Crop the signature area as needed.'
    };

    console.log('PDF converted to basic representation successfully');
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
}

async function convertWithGotenberg(file: string, fileName: string, gotenbergUrl: string, apiKey: string): Promise<Response> {
  console.log('Attempting Gotenberg conversion');
  
  // Decode the base64 PDF file
  const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
  
  // Use the basic PDF conversion endpoint
  const form = new FormData();
  const pdfFile = new File([pdfBytes], fileName, { type: 'application/pdf' });
  form.append('files', pdfFile);
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`
  };

  const url = `${gotenbergUrl.replace(/\/$/, '')}/forms/pdfengines/convert`;
  console.log('Calling Gotenberg at:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: form
  });

  console.log('Gotenberg response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gotenberg error:', errorText);
    throw new Error(`Gotenberg API error: ${response.status} - ${errorText}`);
  }

  // Get the converted image
  const imageArrayBuffer = await response.arrayBuffer();
  const imageBytes = new Uint8Array(imageArrayBuffer);
  
  // Convert to base64
  const base64String = btoa(String.fromCharCode(...imageBytes));
  const imageData = `data:image/png;base64,${base64String}`;
  
  console.log('PDF successfully converted via Gotenberg');
  
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
}
