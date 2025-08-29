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

    // Get Gotenberg configuration
    const GOTENBERG_URL = Deno.env.get('GOTENBERG_URL') || 'https://pdf.sendyourcards.io';
    const GOTENBERG_API_KEY = Deno.env.get('GOTENBERG_API_KEY');

    console.log('Gotenberg URL:', GOTENBERG_URL);
    console.log('API Key configured:', !!GOTENBERG_API_KEY);

    if (!GOTENBERG_URL || !GOTENBERG_API_KEY) {
      console.log('Gotenberg not available, using fallback method');
      // Fall back to text extraction method
      return fallbackPdfToImage(file, fileName);
    }

    try {
      // Decode the base64 PDF file
      const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
      
      // Use Gotenberg to convert PDF to image via Chromium screenshot
      const form = new FormData();
      
      // Create HTML that embeds the PDF for screenshot
      const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));
      const htmlContent = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; width: 100vw; height: 100vh; }
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

      // Use Chromium screenshot endpoint
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
        console.log('Falling back to text extraction method');
        return fallbackPdfToImage(file, fileName);
      }

      // Get the image data from Gotenberg
      const imageArrayBuffer = await gotenbergResp.arrayBuffer();
      const imageBytes = new Uint8Array(imageArrayBuffer);
      
      // Convert to base64
      const base64String = btoa(String.fromCharCode(...imageBytes));
      const imageData = `data:image/png;base64,${base64String}`;
      
      console.log('PDF successfully converted to PNG using Gotenberg');
      
      return new Response(JSON.stringify({ 
        imageData: imageData,
        fileName: fileName.replace('.pdf', '.png'),
        width: 800, // Default dimensions
        height: 1000
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (gotenbergError) {
      console.error('Gotenberg conversion failed:', gotenbergError);
      console.log('Falling back to text extraction method');
      return fallbackPdfToImage(file, fileName);
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

// Fallback function for text extraction when Gotenberg fails
async function fallbackPdfToImage(file: string, fileName: string): Promise<Response> {
  try {
    console.log('Using enhanced PDF text extraction...');
    
    // Decode the base64 PDF file
    const pdfBytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));
    
    // Try different approaches to extract meaningful content
    const pdfString = new TextDecoder('latin1').decode(pdfBytes);
        
    // Method 1: Look for readable text patterns
    let extractedTexts: string[] = [];
    
    // Try to find actual readable text using multiple approaches
    const approaches = [
      // Look for text in parentheses that appears to be readable
      () => {
        const matches = pdfString.match(/\([^)]{1,100}\)/g) || [];
        return matches
          .map(match => match.replace(/[()]/g, '').trim())
          .filter(text => {
            // Filter for text that looks like actual words/content
            const isReadable = /^[a-zA-Z0-9\s\-.,!?@#$%&*()]+$/.test(text);
            const hasLetters = /[a-zA-Z]/.test(text);
            const notTooShort = text.length >= 2;
            const notTooLong = text.length <= 50;
            const notJustSymbols = !/^[^a-zA-Z0-9\s]{3,}$/.test(text);
            
            return isReadable && hasLetters && notTooShort && notTooLong && notJustSymbols;
          });
      },
      
      // Look for words in the PDF structure
      () => {
        const wordMatches = pdfString.match(/\b[A-Za-z][A-Za-z\s]{2,20}\b/g) || [];
        return wordMatches
          .filter(word => word.length >= 3 && word.length <= 30)
          .filter(word => !/^(obj|endobj|stream|endstream|xref|trailer|startxref|PDF)$/i.test(word));
      },
      
      // Look for email-like patterns, names, common words
      () => {
        const patterns = [
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
          /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // names like "John Smith"
          /\b(?:Dear|Hello|Hi|Sincerely|Best|Regards|From|To|Subject|Date|Phone|Email|Address)\b/gi, // common words
          /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // dates
          /\b\d{3}-\d{3}-\d{4}\b/g // phone numbers
        ];
        
        let results: string[] = [];
        patterns.forEach(pattern => {
          const matches = pdfString.match(pattern) || [];
          results.push(...matches);
        });
        return results;
      }
    ];
    
    // Try each approach and use the best results
    for (const approach of approaches) {
      try {
        const results = approach();
        if (results.length > 0) {
          extractedTexts.push(...results);
        }
      } catch (e) {
        console.log('Approach failed:', e);
      }
    }
    
    // Clean and deduplicate texts
    const cleanedTexts = [...new Set(extractedTexts)]
      .map(text => text.trim())
      .filter(text => text.length > 1 && text.length <= 50)
      .slice(0, 10); // Limit to first 10 meaningful texts
    
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
};