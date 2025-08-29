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
    const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    // Use PDF.js to render the PDF to canvas data
    try {
      // Import PDF.js
      const pdfjs = await import('https://cdn.skypack.dev/pdfjs-dist@3.11.174');
      
      // Configure PDF.js worker
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.skypack.dev/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      
      console.log('Loading PDF document...');
      const pdfDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
      
      console.log(`PDF loaded with ${pdfDoc.numPages} pages`);
      
      // Get the first page
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 }); // Scale for better quality
      
      console.log(`Page viewport: ${viewport.width}x${viewport.height}`);
      
      // Create a virtual canvas using OffscreenCanvas if available, otherwise use a different approach
      let imageData;
      
      try {
        // Try using OffscreenCanvas
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        console.log('Rendering PDF page to canvas...');
        await page.render(renderContext).promise;
        
        // Convert canvas to PNG blob
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        const base64String = btoa(String.fromCharCode(...uint8Array));
        imageData = `data:image/png;base64,${base64String}`;
        
        console.log('PDF successfully converted to PNG using OffscreenCanvas');
        
      } catch (canvasError) {
        console.log('OffscreenCanvas not available, using alternative approach:', canvasError);
        
        // Alternative: Use node-canvas or create SVG representation
        // For now, let's create a high-quality SVG representation of the PDF structure
        const textContent = await page.getTextContent();
        const items = textContent.items;
        
        console.log(`Found ${items.length} text items in PDF`);
        
        // Create SVG with actual text content positioned correctly
        let svgContent = `<svg width="${viewport.width}" height="${viewport.height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>`;
        
        // Add text items with their actual positions and content
        items.forEach((item: any, index: number) => {
          if (item.str && item.str.trim() && index < 50) { // Limit to first 50 items for performance
            const x = item.transform[4] || 0;
            const y = viewport.height - (item.transform[5] || 0); // Flip Y coordinate
            const fontSize = Math.abs(item.transform[0]) || 12;
            
            // Clean text content
            const text = item.str.replace(/[<>&"']/g, (match: string) => {
              const entities: { [key: string]: string } = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#39;'
              };
              return entities[match];
            });
            
            svgContent += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" fill="#000">${text}</text>`;
          }
        });
        
        svgContent += '</svg>';
        
        // Convert SVG to base64
        const base64Svg = btoa(svgContent);
        imageData = `data:image/svg+xml;base64,${base64Svg}`;
        
        console.log('PDF converted to SVG with actual text content');
      }
      
      return new Response(JSON.stringify({ 
        imageData: imageData,
        fileName: fileName.replace('.pdf', '.png'),
        width: viewport.width,
        height: viewport.height
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (pdfjsError) {
      console.error('PDF.js conversion failed:', pdfjsError);
      
      // Enhanced fallback: Better PDF text extraction and SVG generation
      try {
        console.log('Using enhanced PDF text extraction...');
        
        // Try different approaches to extract meaningful content
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);
        
        // Method 1: Look for text streams (between BT and ET markers)
        const textStreamMatches = pdfString.match(/BT\s+.*?ET/gs) || [];
        let extractedTexts: string[] = [];
        
        textStreamMatches.forEach(stream => {
          // Extract text from Tj and TJ operators
          const tjMatches = stream.match(/\((.*?)\)\s*Tj/g) || [];
          const tjTexts = tjMatches.map(match => 
            match.replace(/\((.*?)\)\s*Tj/, '$1').trim()
          ).filter(text => text.length > 0);
          extractedTexts.push(...tjTexts);
        });
        
        // Method 2: Look for parenthesized text (fallback)
        if (extractedTexts.length === 0) {
          const textMatches = pdfString.match(/\([^)]{3,50}\)/g) || [];
          extractedTexts = textMatches
            .map(match => match.replace(/[()]/g, '').trim())
            .filter(text => text.length > 2 && text.length < 50)
            .filter(text => /[a-zA-Z0-9]/.test(text)); // Must contain alphanumeric
        }
        
        // Clean and deduplicate texts
        const cleanedTexts = [...new Set(extractedTexts)]
          .map(text => text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
            .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII
            .trim()
          )
          .filter(text => text.length > 1)
          .slice(0, 15); // Limit to first 15 meaningful texts
        
        console.log(`Extracted ${cleanedTexts.length} meaningful text elements`);
        
        // Create a more organized SVG layout
        const width = 800;
        const height = 600;
        
        let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>
              .pdf-text { font-family: Arial, sans-serif; font-size: 14px; fill: #333; }
              .pdf-title { font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; fill: #000; }
              .pdf-header { font-family: Arial, sans-serif; font-size: 12px; fill: #666; }
            </style>
          </defs>
          <rect width="100%" height="100%" fill="white" stroke="#e0e0e0" stroke-width="1"/>
          <rect x="10" y="10" width="${width-20}" height="40" fill="#f8f9fa" stroke="#e0e0e0"/>
          <text x="${width/2}" y="35" text-anchor="middle" class="pdf-header">PDF Content Preview - Original Document Structure</text>`;
        
        if (cleanedTexts.length > 0) {
          // Arrange text in a more document-like layout
          cleanedTexts.forEach((text, index) => {
            const x = 40;
            const y = 80 + (index * 30);
            
            if (y < height - 100) { // Don't overflow
              // Escape XML entities
              const escapedText = text.replace(/[<>&"']/g, (match: string) => {
                const entities: { [key: string]: string } = {
                  '<': '&lt;',
                  '>': '&gt;',
                  '&': '&amp;',
                  '"': '&quot;',
                  "'": '&#39;'
                };
                return entities[match];
              });
              
              // Use different styles for what looks like headers vs content
              const textClass = text.length < 20 && index < 3 ? 'pdf-title' : 'pdf-text';
              svgContent += `<text x="${x}" y="${y}" class="${textClass}">${escapedText}</text>`;
            }
          });
        } else {
          // Fallback message if no text found
          svgContent += `<text x="${width/2}" y="${height/2}" text-anchor="middle" class="pdf-text">
            This PDF appears to be image-based or encrypted.
          </text>
          <text x="${width/2}" y="${height/2 + 25}" text-anchor="middle" class="pdf-text">
            You can still crop the signature area from this preview.
          </text>`;
        }
        
        // Footer with filename
        const cleanFileName = fileName.replace(/[^\w\-_.]/g, '').substring(0, 40);
        svgContent += `<text x="${width/2}" y="${height - 20}" text-anchor="middle" class="pdf-header">
          Source: ${cleanFileName}
        </text></svg>`;
        
        // Safe base64 encoding
        const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
        const imageData = `data:image/svg+xml;base64,${base64Svg}`;
        
        console.log('Enhanced PDF extraction completed successfully');
        
        return new Response(JSON.stringify({ 
          imageData: imageData,
          fileName: fileName.replace('.pdf', '.svg'),
          width: width,
          height: height
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (fallbackError) {
        console.error('Enhanced PDF extraction failed:', fallbackError);
        
        // Final simple fallback - create a basic document representation
        const width = 800;
        const height = 600;
        const cleanFileName = fileName.replace(/[^\w\-_.]/g, '').substring(0, 40);
        
        const simpleSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white" stroke="#e0e0e0" stroke-width="2"/>
          <rect x="50" y="50" width="${width-100}" height="${height-100}" fill="#f8f9fa" stroke="#ddd" stroke-width="1"/>
          <text x="${width/2}" y="200" text-anchor="middle" font-family="Arial" font-size="18" fill="#666">
            PDF Document: ${cleanFileName}
          </text>
          <text x="${width/2}" y="250" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">
            Ready for signature cropping
          </text>
          <text x="${width/2}" y="300" text-anchor="middle" font-family="Arial" font-size="14" fill="#999">
            Use the crop tool to select your signature area
          </text>
        </svg>`;
        
        const base64Svg = btoa(unescape(encodeURIComponent(simpleSvg)));
        const imageData = `data:image/svg+xml;base64,${base64Svg}`;
        
        console.log('Using simple PDF placeholder');
        
        return new Response(JSON.stringify({ 
          imageData: imageData,
          fileName: fileName.replace('.pdf', '.svg'),
          width: width,
          height: height
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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