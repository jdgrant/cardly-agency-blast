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

    // Try to extract order ID from message
    const orderIdMatch = message.match(/\d{8}-[a-z0-9]{5}/i);
    let orderContext = '';
    
    if (orderIdMatch) {
      const readableOrderId = orderIdMatch[0];
      const { data: orderData, error: orderError } = await supabase
        .rpc('get_order_for_customer_management', { short_id: readableOrderId.split('-')[1] });
      
      if (!orderError && orderData && orderData.length > 0) {
        const order = orderData[0];
        orderContext = `\n\nORDER DATA FOR ${readableOrderId}:
- Status: ${order.status}
- Card Quantity: ${order.card_quantity}
- Template: ${order.template_id}
- Mailing Window: ${order.mailing_window}
- Created: ${new Date(order.created_at).toLocaleDateString()}
- Invoice Paid: ${order.invoice_paid ? 'Yes' : 'No'}
- Has Signature: ${order.signature_url ? 'Yes' : 'No'}
${order.drop_date ? `- Drop Date: ${new Date(order.drop_date).toLocaleDateString()}` : ''}
${order.pcm_order_id ? `- Sent to Production: Yes` : '- Sent to Production: No'}`;
      }
    }

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
            content: `You are a helpful customer support assistant for a greeting card service.${orderContext}

CRITICAL INSTRUCTIONS:
- ONLY provide information about orders when you have ACTUAL ORDER DATA provided above
- NEVER make up or estimate order statuses, delivery dates, or shipping information
- If an order ID is mentioned but no data is provided, say "I don't have access to that order information. Please contact support@sendyourcards.io"
- Status meanings: "pending" = payment pending, "approved" = paid and being prepared, "sent_to_press" = at printer, "shipped" = delivered
- If you cannot answer a question with certainty, say "I'm not sure about that. Let me create a support ticket for you."

You can help with:
- Order tracking when data is available
- General questions about customization, pricing, mailing windows
- Creating support tickets for human assistance

Be friendly, honest, and helpful. Never guess or hallucinate information.`
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