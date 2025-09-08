import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhysicalMailingRequest {
  orderId: string;
  recipientAddresses: Array<{
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, recipientAddresses }: PhysicalMailingRequest = await req.json();
    
    console.log('Sending physical greeting cards for order:', orderId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get PCM API key
    const pcmApiKey = Deno.env.get('PCM_API_KEY');
    if (!pcmApiKey) {
      throw new Error('PCM_API_KEY not found in environment variables');
    }

    // Fetch order details including card previews
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    // PCM DirectMail API expects specific format for greeting card mailings
    const pcmRequest = {
      // This would be the actual PCM API format - needs to be updated based on their docs
      recipients: recipientAddresses.map(addr => ({
        firstName: addr.name.split(' ')[0],
        lastName: addr.name.split(' ').slice(1).join(' '),
        address1: addr.address1,
        address2: addr.address2 || '',
        city: addr.city,
        state: addr.state,
        zipCode: addr.zip
      })),
      // Would include greeting card design, message, etc. from the order
      design: {
        front: order.front_preview_base64,
        inside: order.inside_preview_base64,
        message: order.message
      }
    };

    console.log('PCM API request for greeting cards:', pcmRequest);

    // For now, simulate the API call
    console.log('Would send to PCM DirectMail API for physical greeting card printing and mailing');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Physical greeting cards queued for ${recipientAddresses.length} recipients`,
        pcmJobId: 'simulated-' + Date.now()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-physical-greeting-cards function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);