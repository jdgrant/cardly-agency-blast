import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, userEmail, orderId } = await req.json();
    console.log('Chat request:', { sessionId, message, userEmail, orderId });

    const supabaseUrl = "https://wsibvneidsmtsazfbmgc.supabase.co";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!supabaseKey || !lovableApiKey) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create or get session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ user_email: userEmail, order_id: orderId })
        .select()
        .single();

      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    // Store user message
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message
      });

    if (userMessageError) throw userMessageError;

    // Get conversation history
    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    // Format messages for AI
    const conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful customer support assistant for a greeting card service. 
Help users with:
- Order tracking and status
- Customization options (templates, messages, logos, signatures)
- Pricing and packages
- Mailing windows and delivery times
- Technical issues
Be friendly, concise, and helpful. If you don't know something, admit it and suggest contacting support directly.`
          },
          ...conversationHistory
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Store assistant message
    const { error: assistantMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: assistantMessage
      });

    if (assistantMessageError) throw assistantMessageError;

    return new Response(
      JSON.stringify({
        sessionId: currentSessionId,
        message: assistantMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Support chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});