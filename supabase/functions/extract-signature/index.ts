
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
    const { file, fileType, fileName } = await req.json();
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${fileType} file: ${fileName}`);

    // For PDFs, we need to inform the user that only image files are supported
    if (fileType === 'application/pdf') {
      return new Response(JSON.stringify({ 
        error: 'PDF files are not supported. Please upload an image file (JPG, PNG, HEIC) containing your signature.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine the media type for OpenAI (only image types)
    let mediaType = 'image/jpeg';
    if (fileType.includes('png')) {
      mediaType = 'image/png';
    } else if (fileType.includes('heic') || fileType.includes('heif')) {
      mediaType = 'image/heic';
    }
    
    // Call OpenAI Vision API to analyze and describe the signature
    const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an expert at analyzing handwritten signatures in images. Describe the signature you see in detail, focusing on the style, characteristics, and any unique features.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this image and describe the handwritten signature you see. Focus on the signature style, stroke characteristics, and any unique features that would help recreate it.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${file}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    const visionResult = await visionResponse.json();
    
    if (!visionResponse.ok) {
      console.error('OpenAI Vision API error:', visionResult);
      throw new Error(`OpenAI Vision API error: ${visionResult.error?.message || 'Unknown error'}`);
    }

    const signatureDescription = visionResult.choices[0].message.content;
    console.log('Signature analysis:', signatureDescription);

    // Use DALL-E to generate a clean signature based on the analysis
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Create a clean, high-contrast handwritten signature based on this description: "${signatureDescription}". The signature should be black ink on a transparent background, suitable for printing on greeting cards. Make it elegant and professional with clear, smooth strokes. No borders, frames, or background elements - just the signature itself.`,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'b64_json'
      }),
    });

    const imageResult = await imageResponse.json();
    
    if (!imageResponse.ok) {
      console.error('Image generation error:', imageResult);
      throw new Error(`Image generation error: ${imageResult.error?.message || 'Unknown error'}`);
    }

    return new Response(JSON.stringify({ 
      signatureImage: `data:image/png;base64,${imageResult.data[0].b64_json}`,
      analysis: signatureDescription
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
