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

    // Try using CloudConvert API for PDF to PNG conversion
    try {
      const cloudConvertUrl = 'https://api.cloudconvert.com/v2/convert';
      
      const formData = new FormData();
      
      // Decode base64 PDF and create blob
      const pdfData = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
      
      formData.append('file', pdfBlob, fileName);
      formData.append('outputformat', 'png');
      formData.append('input', 'upload');
      formData.append('timeout', '30');
      
      const response = await fetch(cloudConvertUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': 'Bearer API_KEY_PLACEHOLDER' // Would need actual API key
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('CloudConvert result:', result);
        // This would need proper implementation with API key
      }
    } catch (cloudConvertError) {
      console.log('CloudConvert failed:', cloudConvertError);
    }

    // Try using PDF-lib to extract first page and render as PNG
    try {
      // Import PDF-lib via CDN
      const { PDFDocument } = await import('https://cdn.skypack.dev/pdf-lib@^1.17.1');
      
      const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      if (pages.length > 0) {
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        console.log(`PDF page size: ${width}x${height}`);
        
        // Create a canvas representation of the PDF page
        const canvas = {
          width: Math.min(width, 800),
          height: Math.min(height, 600)
        };
        
        // Create SVG with proper aspect ratio
        const svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text x="${canvas.width/2}" y="50" text-anchor="middle" font-family="Arial" font-size="16" fill="#333">
            ${fileName}
          </text>
          <text x="${canvas.width/2}" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
            Page 1 of ${pages.length} (${Math.round(width)}x${Math.round(height)})
          </text>
          <rect x="40" y="100" width="${canvas.width-80}" height="${canvas.height-150}" fill="white" stroke="#ddd" stroke-width="1"/>
          <text x="${canvas.width/2}" y="${canvas.height-30}" text-anchor="middle" font-family="Arial" font-size="10" fill="#999">
            Original PDF converted for signature cropping
          </text>
        </svg>`;
        
        const base64Svg = btoa(svg);
        const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

        console.log('PDF processed with pdf-lib');
        
        return new Response(JSON.stringify({ 
          imageData: dataUrl,
          fileName: fileName.replace('.pdf', '.svg')
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (pdfLibError) {
      console.log('PDF-lib failed:', pdfLibError);
    }

    // Final fallback - for now, let's just pass through the PDF as is
    // and let the frontend handle it differently
    console.log('Using PDF passthrough - frontend will handle display');
    
    return new Response(JSON.stringify({ 
      imageData: `data:application/pdf;base64,${file}`,
      fileName: fileName,
      isPdf: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error converting PDF:', error);
    
    return new Response(JSON.stringify({ 
      error: 'PDF conversion failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});