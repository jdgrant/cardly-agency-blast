import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Official mailing windows used to prevent hallucinated timelines
const OFFICIAL_WINDOWS = [
  { id: 'dec-1-5', label: 'Dec 1–5' },
  { id: 'dec-6-10', label: 'Dec 6–10' },
  { id: 'dec-11-15', label: 'Dec 11–15' },
  { id: 'dec-16-20', label: 'Dec 16–20' },
];

function windowsPolicyAnswer() {
  const list = OFFICIAL_WINDOWS.map(w => `- ${w.label} (id: ${w.id})`).join('\n');
  return `To ensure on-time delivery, choose one of our official mailing windows:\n${list}\nWe drop mail 2 days before the first date of your selected window. Which window would you like?`;
}

// Enforce no-generic-timeline policy
function enforceMailingWindowsPolicy(userText: string, aiText: string): string {
  const banned = [
    /business\s*days?/i,
    /\b\d+\s*[-–]?\s*\d+\s*days?\b/i,
    /\bweeks?\b/i,
    /\bturnaround\b/i,
    /processing and shipping/i,
  ];
  const mentionsWindow = /dec\s*\d|window|dec-\d{1,2}-\d{1,2}|dec\s*1–5|6–10|11–15|16–20/i.test(aiText);
  const violates = banned.some(re => re.test(aiText));
  if (violates || !mentionsWindow) {
    return windowsPolicyAnswer();
  }
  return aiText;
}

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

OFFICIAL MAILING WINDOWS (use these only):
- Dec 1–5 (id: dec-1-5)
- Dec 6–10 (id: dec-6-10)
- Dec 11–15 (id: dec-11-15)
- Dec 16–20 (id: dec-16-20)

MAILING POLICY:
- Customers choose one window; cards are mailed within that window.
- We drop mail 2 days before the first date of the selected window.
- NEVER provide generic turnaround like "7–10 business days". Use the windows above only.
- If asked about a deadline/delivery without a chosen window, list the available windows and ask which they prefer.

CRITICAL INSTRUCTIONS:
- ONLY provide information about orders when you have ACTUAL ORDER DATA provided above
- NEVER make up or estimate order statuses, delivery dates, or shipping information beyond the rules above
- If an order ID is mentioned but no data is provided, say "I don't have access to that order information. Please contact support@sendyourcards.io"
- Status meanings: pending, approved, sent_to_press, shipped
- If you don't have specific information to answer a question, IMMEDIATELY suggest: "I'd be happy to help with that! Would you like me to create a support ticket so our team can assist you directly?"

WHAT YOU CAN HELP WITH:
- Order tracking when actual data is available
- Mailing windows (Dec 1-5, 6-10, 11-15, 16-20 only)
- Basic questions about the ordering process visible on the website

FOR EVERYTHING ELSE: Offer to create a support ticket immediately. Don't make up answers.

Be friendly and honest. Never guess or make up information.`
          },
          ...conversationHistory
        ],
        temperature: 0,
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let assistantMessage = aiData.choices[0].message.content || '';
    assistantMessage = enforceMailingWindowsPolicy(message, assistantMessage);

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
