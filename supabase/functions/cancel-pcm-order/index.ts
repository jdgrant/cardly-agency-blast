import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelOrderRequest {
  orderId: string;
  pcmOrderId: string;
  adminSessionId: string;
  isProduction: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== PCM ORDER CANCELLATION REQUEST ===');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, pcmOrderId, adminSessionId, isProduction }: CancelOrderRequest = await req.json();
    console.log('Cancelling PCM order:', pcmOrderId, 'for order:', orderId, 'in', isProduction ? 'PRODUCTION' : 'SANDBOX', 'mode');

    // Get PCM API credentials based on environment
    const pcmApiKey = isProduction 
      ? Deno.env.get('PCM_API_KEY')
      : Deno.env.get('PCM_SANDBOX_API_KEY');
    const pcmApiSecret = isProduction 
      ? Deno.env.get('PCM_API_SECRET')  
      : Deno.env.get('PCM_SANDBOX_API_SECRET');

    if (!pcmApiKey || !pcmApiSecret) {
      throw new Error('PCM API credentials not configured');
    }

    // Authenticate with PCM API
    console.log('=== PCM AUTHENTICATION ===');
    const authPayload = {
      apiKey: pcmApiKey,
      apiSecret: pcmApiSecret,
      isSandbox: !isProduction
    };

    console.log('Request Packet:', JSON.stringify(authPayload, null, 2));
    console.log('URL:', 'https://v3.pcmintegrations.com/auth/login');

    const authResponse = await fetch('https://v3.pcmintegrations.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authPayload)
    });

    console.log('PCM auth response status:', authResponse.status);

    if (!authResponse.ok) {
      console.error('PCM authentication failed:', authResponse.status, authResponse.statusText);
      throw new Error(`PCM authentication failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    console.log('PCM auth raw response:', JSON.stringify(authData));

    if (!authData.token) {
      throw new Error('No authentication token received from PCM API');
    }

    console.log('PCM authentication successful');

    // Cancel the order using DELETE endpoint
    console.log('=== CANCELLING PCM ORDER ===');
    console.log('URL:', `https://v3.pcmintegrations.com/order/${pcmOrderId}`);

    const cancelResponse = await fetch(`https://v3.pcmintegrations.com/order/${pcmOrderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authData.token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Cancel response status:', cancelResponse.status);
    console.log('Cancel response headers:', Object.fromEntries(cancelResponse.headers.entries()));

    const responseText = await cancelResponse.text();
    console.log('Cancel response body:', responseText);

    let cancelData;
    try {
      cancelData = JSON.parse(responseText);
    } catch (e) {
      // Some successful DELETE responses might not return JSON
      cancelData = { message: responseText || 'Order cancelled successfully' };
    }

    if (cancelResponse.ok) {
      console.log('✅ PCM order cancelled successfully!');
      
      // Clear PCM info from our database using the function we created
      const { error: dbError } = await supabaseClient.rpc('cancel_pcm_order', {
        order_id_param: orderId,
        session_id_param: adminSessionId
      });

      if (dbError) {
        console.error('Database update error:', dbError);
        throw new Error(`Failed to update database: ${dbError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'PCM order cancelled successfully',
          pcmResponse: cancelData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      console.error('PCM cancellation failed:', cancelResponse.status, cancelData);
      throw new Error(`PCM order cancellation failed: ${cancelData?.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error in cancel-pcm-order function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
};

serve(handler);