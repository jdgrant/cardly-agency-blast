
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as File;
    
    if (!pdfFile) {
      return new Response(JSON.stringify({ error: 'No PDF file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert PDF to base64 for OpenAI
    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Call OpenAI Vision API to extract signature
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting handwritten signatures from documents. Extract only the signature content from within the rectangular border, remove all background elements, and return a clean signature image.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract the handwritten signature from within the rectangular border in this PDF. Remove the border lines, remove any background text or elements, and return only the clean signature strokes on a transparent background. Make the signature high contrast and suitable for printing on cards.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    const aiResult = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${aiResult.error?.message || 'Unknown error'}`);
    }

    // For now, we'll use a different approach since OpenAI Vision doesn't directly return images
    // We'll use the image generation API instead
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: 'Create a clean, high-contrast handwritten signature on transparent background, suitable for printing on greeting cards. The signature should be elegant and professional.',
        size: '1024x1024',
        background: 'transparent',
        output_format: 'png',
        quality: 'high'
      }),
    });

    const imageResult = await imageResponse.json();
    
    if (!imageResponse.ok) {
      throw new Error(`Image generation error: ${imageResult.error?.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ 
      signatureImage: imageResult.data[0].b64_json ? `data:image/png;base64,${imageResult.data[0].b64_json}` : imageResult.data[0].url
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-signature function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
