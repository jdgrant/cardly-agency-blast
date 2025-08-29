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
      
      // Final fallback: Try to use a simple PDF structure analysis
      try {
        const pdfString = new TextDecoder('latin1').decode(pdfBytes);
        console.log('Analyzing PDF structure...');
        
        // Look for text content in PDF
        const textMatches = pdfString.match(/\((.*?)\)/g) || [];
        const cleanedTexts = textMatches
          .map(match => match.replace(/[()]/g, '').trim())
          .filter(text => text.length > 0 && text.length < 100)
          .slice(0, 20);
        
        console.log(`Found ${cleanedTexts.length} text elements`);
        
        // Create SVG with extracted text
        const width = 800;
        const height = 600;
        
        let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white" stroke="#ddd" stroke-width="1"/>`;
        
        // Add extracted text at various positions
        cleanedTexts.forEach((text, index) => {
          const x = 50 + (index % 2) * 350;
          const y = 80 + (Math.floor(index / 2) * 25);
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
          
          svgContent += `<text x="${x}" y="${y}" font-size="14" font-family="Arial" fill="#333">${escapedText}</text>`;
        });
        
        svgContent += `<text x="400" y="${height - 50}" text-anchor="middle" font-size="12" fill="#666">
          PDF: ${fileName} - Content extracted for signature cropping
        </text></svg>`;
        
        const base64Svg = btoa(svgContent);
        const imageData = `data:image/svg+xml;base64,${base64Svg}`;
        
        console.log('PDF content extracted and converted to SVG');
        
        return new Response(JSON.stringify({ 
          imageData: imageData,
          fileName: fileName.replace('.pdf', '.svg')
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (fallbackError) {
        console.error('All conversion methods failed:', fallbackError);
        throw new Error('Unable to process PDF file');
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