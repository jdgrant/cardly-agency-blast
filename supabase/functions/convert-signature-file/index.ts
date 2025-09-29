import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert base64 to Uint8Array
    const base64Data = file.includes(',') ? file.split(',')[1] : file;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = fileType === 'application/pdf' ? 'pdf' : 
                         fileType.split('/')[1] || 'png';
    const storageFileName = `signatures/signature_${timestamp}.${fileExtension}`;

    console.log(`Uploading file to storage: ${storageFileName}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('holiday-cards')
      .upload(storageFileName, binaryData, {
        contentType: fileType,
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('holiday-cards')
      .getPublicUrl(storageFileName);

    console.log(`File uploaded successfully: ${publicUrl}`);

    return new Response(JSON.stringify({
      success: true,
      processedFileUrl: publicUrl,
      fileName: fileName,
      originalFormat: fileType,
      message: 'File uploaded successfully for review'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing signature file:', error);
    
    return new Response(JSON.stringify({ 
      error: 'File processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

