import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Boot marker for deployment
console.log('generate-template-pdf edge function loaded');

interface GenerateTemplatePDFRequest {
  templateId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId } = await req.json() as GenerateTemplatePDFRequest;
    
    if (!templateId) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating template PDF for: ${templateId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch template details
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw new Error(`Template not found: ${templateError.message}`);
    }

    // Generate HTML content for card front
    const frontHTML = generateFrontCardHTML(template);

    // Create PDF with embedded HTML content
    const frontPDF = await generateHTMLPDF(frontHTML, `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.pdf`);

    // Upload PDF to storage
    const frontPDFPath = `template-pdfs/${templateId}_${Date.now()}.pdf`;

    const { error: frontUploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(frontPDFPath, frontPDF, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (frontUploadError) {
      throw new Error(`PDF upload failed: ${frontUploadError.message}`);
    }

    console.log(`Template PDF generated successfully for ${templateId}`);

    // Generate public download URL
    const { data: frontSignedUrl } = await supabase.storage
      .from('holiday-cards')
      .createSignedUrl(frontPDFPath, 3600); // 1 hour expiry

    return new Response(JSON.stringify({ 
      success: true,
      pdfPath: frontPDFPath,
      downloadUrl: frontSignedUrl?.signedUrl || null,
      message: 'Template PDF generated successfully with 7" x 5.125" dimensions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-template-pdf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate template PDF' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFrontCardHTML(template: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 7in 5.125in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 7in;
          height: 5.125in;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .card-front {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: white;
          border: 2px solid #e5e7eb;
          box-sizing: border-box;
        }
        .template-preview {
          width: calc(100% - 40px);
          height: calc(100% - 40px);
          background-image: url('${template.preview_url}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          position: relative;
        }
        .template-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white;
          padding: 20px;
          border-radius: 0 0 8px 8px;
        }
        .template-name {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .template-description {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.4;
        }
        .fallback-content {
          width: 100%;
          height: 100%;
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          box-sizing: border-box;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        .card-info {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255,255,255,0.9);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 10px;
          color: #64748b;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .template-id {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(255,255,255,0.9);
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 9px;
          color: #6b7280;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="card-front">
        <div class="template-preview">
          <div class="template-overlay">
            <div class="template-name">${template.name}</div>
            <div class="template-description">${template.description || 'Holiday Card Template'}</div>
          </div>
        </div>
        <div class="card-info">
          7" × 5.125" Template
        </div>
        <div class="template-id">
          ID: ${template.id}
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateHTMLPDF(htmlContent: string, filename: string): Promise<Uint8Array> {
  console.log('Generating PDF for:', filename);
  
  // Convert 7in x 5.125in to points (1 inch = 72 points)
  const pageWidth = 7 * 72; // 504 points
  const pageHeight = 5.125 * 72; // 369 points
  
  // Extract and clean text content from HTML
  const textContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Create a structured content stream
  const contentLines = [
    `Template: ${filename.replace('.pdf', '')}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    `Dimensions: 7" x 5.125"`,
    '',
    ...textContent.split(' ').reduce((lines: string[], word: string, index: number) => {
      const lineIndex = Math.floor(index / 8);
      if (!lines[lineIndex]) lines[lineIndex] = '';
      lines[lineIndex] += (lines[lineIndex] ? ' ' : '') + word;
      return lines;
    }, []).slice(0, 20)
  ];

  // Build PDF content stream
  let yPosition = pageHeight - 50;
  let contentStream = 'BT\n/F1 14 Tf\n';
  
  contentLines.forEach((line, index) => {
    const fontSize = index < 3 ? 14 : 10;
    const escapedLine = line.substring(0, 60).replace(/[()\\]/g, '\\$&');
    contentStream += `/F1 ${fontSize} Tf\n50 ${yPosition} Td\n(${escapedLine}) Tj\n`;
    yPosition -= fontSize + 5;
    if (yPosition < 50) yPosition = 50; // Don't go below page bottom
  });
  
  contentStream += 'ET';
  const streamLength = contentStream.length;

  // Generate proper PDF with 7"x5.125" dimensions
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${pageWidth} ${pageHeight}]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000${320 + streamLength} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${380 + streamLength}
%%EOF`;

  const pdfBytes = new TextEncoder().encode(pdfContent);
  console.log('Generated PDF size:', pdfBytes.length, 'bytes');
  return pdfBytes;
}