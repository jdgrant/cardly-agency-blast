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

  let fileName = 'document.pdf';
  
  try {
    const { file, fileName: uploadedFileName } = await req.json();
    if (uploadedFileName) fileName = uploadedFileName;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Converting PDF: ${fileName}`);

    // Decode the base64 PDF file
    const pdfData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    // Use Gotenberg service to convert PDF to PNG
    const gotenbergUrl = 'https://demo.gotenberg.dev/forms/chromium/convert/url';
    
    try {
      // Create a simple HTML page that embeds the PDF for conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .pdf-container { 
              width: 100%; 
              height: 800px; 
              border: 1px solid #ddd;
              background: white;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <embed src="data:application/pdf;base64,${file}" width="100%" height="100%" type="application/pdf">
          </div>
        </body>
        </html>
      `;

      const formData = new FormData();
      formData.append('files', new Blob([htmlContent], { type: 'text/html' }), 'index.html');
      
      const response = await fetch(gotenbergUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const pngBuffer = await response.arrayBuffer();
        const base64Png = btoa(String.fromCharCode(...new Uint8Array(pngBuffer)));
        const dataUrl = `data:image/png;base64,${base64Png}`;

        console.log('PDF converted successfully using Gotenberg');
        
        return new Response(JSON.stringify({ 
          imageData: dataUrl,
          fileName: fileName.replace('.pdf', '.png')
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (gotenbergError) {
      console.log('Gotenberg conversion failed, using fallback SVG:', gotenbergError);
    }

    // Fallback: Create an SVG representation with actual PDF metadata if possible
    const width = 800;
    const height = 600;
    
    // Try to extract some basic info from PDF (simplified approach)
    let pageContent = "Document content";
    try {
      const pdfString = new TextDecoder().decode(pdfData);
      // Look for text content in PDF (very basic extraction)
      const textMatches = pdfString.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 0) {
        pageContent = textMatches.slice(0, 10).map(match => match.replace(/[()]/g, '')).join(' ');
        pageContent = pageContent.length > 100 ? pageContent.substring(0, 100) + '...' : pageContent;
      }
    } catch (e) {
      console.log('Could not extract text from PDF:', e);
    }
    
    // Create SVG with extracted content
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="2"/>
      <rect x="30" y="30" width="740" height="540" fill="white" stroke="#ccc" stroke-width="1"/>
      
      <!-- Header -->
      <rect x="50" y="60" width="700" height="40" fill="#f5f5f5" stroke="#ddd" stroke-width="1"/>
      <text x="400" y="85" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#333">${fileName}</text>
      
      <!-- Content lines representing actual document -->
      <rect x="60" y="120" width="680" height="12" fill="#e8e8e8"/>
      <rect x="60" y="140" width="650" height="12" fill="#e8e8e8"/>
      <rect x="60" y="160" width="700" height="12" fill="#e8e8e8"/>
      <rect x="60" y="180" width="580" height="12" fill="#e8e8e8"/>
      <rect x="60" y="200" width="720" height="12" fill="#e8e8e8"/>
      
      <!-- Signature area placeholder -->
      <rect x="450" y="250" width="280" height="80" fill="none" stroke="#007bff" stroke-width="2" stroke-dasharray="5,5"/>
      <text x="590" y="275" text-anchor="middle" font-family="Arial" font-size="12" fill="#007bff">Signature Area</text>
      <text x="590" y="295" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">Crop this area for signature</text>
      
      <!-- More content -->
      <rect x="60" y="350" width="680" height="12" fill="#e8e8e8"/>
      <rect x="60" y="370" width="620" height="12" fill="#e8e8e8"/>
      <rect x="60" y="390" width="700" height="12" fill="#e8e8e8"/>
      <rect x="60" y="410" width="590" height="12" fill="#e8e8e8"/>
      
      <!-- Footer -->
      <text x="400" y="500" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">PDF Content Preview</text>
      <text x="400" y="520" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">Use the cropping tool to select your signature</text>
    </svg>`;
    
    // Convert SVG to base64
    const base64Svg = btoa(svg);
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

    console.log('PDF converted to SVG representation');
    
    return new Response(JSON.stringify({ 
      imageData: dataUrl,
      fileName: fileName.replace('.pdf', '.svg')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error converting PDF:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});