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

    console.log(`Processing signature file: ${fileName} (${fileType})`);

    // Handle different file types
    if (fileType === 'application/pdf') {
      // For PDFs, just return them as-is with a flag indicating they're PDFs
      // The client can handle them directly
      return new Response(JSON.stringify({
        success: true,
        imageData: `data:${fileType};base64,${file}`,
        fileName: fileName,
        originalFormat: fileType,
        convertedFormat: fileType,
        isPdf: true,
        message: 'PDF ready for cropping'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (fileType.startsWith('image/')) {
      // For images, return them directly
      return new Response(JSON.stringify({
        success: true,
        imageData: `data:${fileType};base64,${file}`,
        fileName: fileName,
        originalFormat: fileType,
        convertedFormat: fileType,
        isPdf: false,
        message: 'Image ready for cropping'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Unsupported file type. Please upload PNG, JPEG, or PDF files only.' 
      }), {
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

