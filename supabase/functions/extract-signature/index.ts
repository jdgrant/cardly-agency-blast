
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
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${fileType} file: ${file.name}`);

    // Convert file to base64 for OpenAI
    const arrayBuffer = await file.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine the media type for OpenAI
    let mediaType = 'image/jpeg';
    if (fileType === 'application/pdf') {
      mediaType = 'application/pdf';
    } else if (fileType.includes('png')) {
      mediaType = 'image/png';
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
            content: 'You are an expert at analyzing handwritten signatures in documents. Describe the signature you see in detail, focusing on the style, characteristics, and positioning within any borders or frames.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: fileType === 'application/pdf' 
                  ? 'Please analyze this PDF document and describe the handwritten signature within the rectangular border. Focus on the signature style, stroke characteristics, and any unique features.'
                  : 'Please analyze this photo and describe the handwritten signature you see. Focus on the signature style, stroke characteristics, and positioning within any borders or frames.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${base64File}`
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
