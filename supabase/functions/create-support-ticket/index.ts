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
    const { sessionId, customerName, customerEmail, customerPhone, issueSummary } = await req.json();
    console.log('Creating support ticket:', { sessionId, customerName, customerEmail });

    const supabaseUrl = "https://wsibvneidsmtsazfbmgc.supabase.co";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY');
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');

    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation context from chat messages
    let conversationContext = '';
    if (sessionId) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messages && messages.length > 0) {
        conversationContext = messages
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n\n');
      }
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        chat_session_id: sessionId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        issue_summary: issueSummary,
        conversation_context: conversationContext,
        status: 'open',
        priority: 'medium'
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    console.log('Ticket created:', ticket.ticket_number);

    // Send email notification to support
    if (mailgunApiKey && mailgunDomain) {
      const ticketUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/admin/tickets/${ticket.id}`;
      
      const emailBody = `
        New Support Ticket: ${ticket.ticket_number}
        
        Customer Information:
        - Name: ${customerName}
        - Email: ${customerEmail}
        - Phone: ${customerPhone || 'Not provided'}
        
        Issue Summary:
        ${issueSummary}
        
        View ticket: ${ticketUrl}
        
        ${conversationContext ? 'Chat Conversation:\n\n' + conversationContext : 'No chat history available'}
      `;

      try {
        const formData = new FormData();
        formData.append('from', 'Support <noreply@sendyourcards.io>');
        formData.append('to', 'support@sendyourcards.io');
        formData.append('subject', `New Support Ticket: ${ticket.ticket_number}`);
        formData.append('text', emailBody);

        const emailResponse = await fetch(
          `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`api:${mailgunApiKey}`)}`,
            },
            body: formData,
          }
        );

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Mailgun error:', errorText);
        } else {
          console.log('Support email sent successfully');
        }
      } catch (emailError) {
        console.error('Failed to send support email:', emailError);
        // Don't fail the ticket creation if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticket_number,
          status: ticket.status
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create ticket error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});