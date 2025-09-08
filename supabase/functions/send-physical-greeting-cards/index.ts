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

    // PCM DirectMail API request format based on their documentation
    const pcmRequest = {
      listCount: recipientAddresses.length,
      productCode: "GC5X7", // 5x7 greeting card
      recipients: recipientAddresses.map(addr => ({
        firstName: addr.name.split(' ')[0] || '',
        lastName: addr.name.split(' ').slice(1).join(' ') || '',
        address1: addr.address1,
        address2: addr.address2 || '',
        city: addr.city,
        state: addr.state,
        zipCode: addr.zip
      })),
      cardDesign: {
        frontImageUrl: order.front_preview_base64 ? `data:image/png;base64,${order.front_preview_base64.replace('data:image/png;base64,', '')}` : '',
        insideMessage: order.custom_message || order.selected_message || '',
        backMessage: '' // Optional back message
      }
    };

    console.log('PCM API request for greeting cards:', JSON.stringify(pcmRequest, null, 2));

    // Make actual call to PCM DirectMail API
    const pcmApiUrl = 'https://api.pcmintegrations.com/v1/directmail/greeting-cards';
    
    const pcmResponse = await fetch(pcmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pcmApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(pcmRequest)
    });

    const pcmResponseData = await pcmResponse.json();
    console.log('PCM API response:', JSON.stringify(pcmResponseData, null, 2));

    if (!pcmResponse.ok) {
      throw new Error(`PCM API error: ${pcmResponse.status} - ${JSON.stringify(pcmResponseData)}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Physical greeting cards submitted to PCM DirectMail for ${recipientAddresses.length} recipients`,
        pcmResponse: pcmResponseData,
        apiUrl: pcmApiUrl,
        requestPayload: pcmRequest
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