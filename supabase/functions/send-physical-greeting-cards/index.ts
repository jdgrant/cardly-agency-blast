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

    // Get PCM API credentials
    const pcmApiKey = Deno.env.get('PCM_API_KEY');
    const pcmApiSecret = Deno.env.get('PCM_API_SECRET');
    
    if (!pcmApiKey || !pcmApiSecret) {
      throw new Error('PCM_API_KEY and PCM_API_SECRET must be configured in environment variables');
    }

    // Step 1: Authenticate with PCM to get bearer token
    console.log('Authenticating with PCM DirectMail API...');
    const authResponse = await fetch('https://v3.pcmintegrations.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: pcmApiKey,
        apiSecret: pcmApiSecret
      })
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      throw new Error(`PCM authentication failed: ${authResponse.status} - ${authError}`);
    }

    const authData = await authResponse.json();
    console.log('PCM authentication successful');

    if (!authData.token) {
      throw new Error('No bearer token received from PCM authentication');
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

    // Step 2: Place greeting card order using bearer token
    const pcmRequest = {
      mailClass: "FirstClassStandard", // Required field from PCM docs
      recipients: recipientAddresses.map(addr => ({
        firstName: addr.name.split(' ')[0] || '',
        lastName: addr.name.split(' ').slice(1).join(' ') || '',
        address1: addr.address1,
        address2: addr.address2 || '',
        city: addr.city,
        state: addr.state,
        zipCode: addr.zip
      })),
      greetingCard: {
        front: order.front_preview_base64 ? order.front_preview_base64.replace('data:image/png;base64,', '') : '',
        inside: order.custom_message || order.selected_message || '',
        back: '' // Optional back message
      }
    };

    console.log('PCM API request for greeting cards:', JSON.stringify(pcmRequest, null, 2));

    // Step 3: Make actual call to PCM DirectMail API with bearer token
    const pcmApiUrl = 'https://v3.pcmintegrations.com/order/greeting-card/with-list-count';
    
    const pcmResponse = await fetch(pcmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`, // Use bearer token from authentication
        'Accept': 'application/json'
      },
      body: JSON.stringify(pcmRequest)
    });

    console.log('PCM API response status:', pcmResponse.status);
    console.log('PCM API response headers:', Object.fromEntries(pcmResponse.headers.entries()));
    
    let pcmResponseData;
    const responseText = await pcmResponse.text();
    console.log('PCM API raw response text:', responseText);
    
    try {
      pcmResponseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Failed to parse PCM response as JSON:', parseError);
      throw new Error(`PCM API returned invalid JSON. Status: ${pcmResponse.status}, Response: ${responseText}`);
    }
    
    console.log('PCM API parsed response:', JSON.stringify(pcmResponseData, null, 2));

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