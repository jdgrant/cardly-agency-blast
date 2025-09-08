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
    const authRequest = {
      apiKey: pcmApiKey,
      apiSecret: pcmApiSecret
    };
    
    const authResponse = await fetch('https://v3.pcmintegrations.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(authRequest)
    });

    let authData;
    const authResponseText = await authResponse.text();
    console.log('PCM auth response status:', authResponse.status);
    console.log('PCM auth raw response:', authResponseText);
    
    try {
      authData = authResponseText ? JSON.parse(authResponseText) : {};
    } catch (parseError) {
      console.error('Failed to parse PCM auth response:', parseError);
      throw new Error(`PCM authentication returned invalid JSON. Status: ${authResponse.status}, Response: ${authResponseText}`);
    }

    if (!authResponse.ok) {
      throw new Error(`PCM authentication failed: ${authResponse.status} - ${JSON.stringify(authData)}`);
    }

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

    console.log('Order data for PCM:', {
      id: order.id,
      production_combined_pdf_public_url: order.production_combined_pdf_public_url,
      production_combined_pdf_path: order.production_combined_pdf_path,
      front_preview_base64: order.front_preview_base64 ? 'exists' : 'null',
      inside_preview_base64: order.inside_preview_base64 ? 'exists' : 'null'
    });

    // Check if we have a production PDF URL for PCM
    if (!order.production_combined_pdf_public_url) {
      throw new Error('No production PDF available for this order. Please generate the production PDF first before sending to PCM DirectMail.');
    }

    // Step 2: Try to create list count with different endpoints
    console.log('Creating list count for PCM...');
    
    // Format recipients for list count creation
    const recipients = recipientAddresses.map(addr => {
      const nameParts = addr.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || 'Customer';
      
      return {
        firstName: firstName,
        lastName: lastName,
        address: addr.address1,
        address2: addr.address2 || '',
        city: addr.city,
        state: addr.state,
        zipCode: addr.zip
      };
    });

    const listCountRequest = {
      recipients: recipients
    };

    // Try alternative endpoints for list count creation
    let listCountData;
    let listCountResponse;
    let listCountText;
    let listCountSuccess = false;
    
    const listCountEndpoints = [
      'https://v3.pcmintegrations.com/list/count',
      'https://v3.pcmintegrations.com/listcount',
      'https://v3.pcmintegrations.com/list-count'
    ];
    
    for (const endpoint of listCountEndpoints) {
      try {
        console.log(`Trying list count endpoint: ${endpoint}`);
        listCountResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(listCountRequest)
        });

        listCountText = await listCountResponse.text();
        console.log(`List count response status for ${endpoint}:`, listCountResponse.status);
        console.log(`List count raw response for ${endpoint}:`, listCountText);
        
        if (listCountResponse.ok) {
          try {
            listCountData = listCountText ? JSON.parse(listCountText) : {};
            if (listCountData.id) {
              console.log('List count created successfully:', listCountData);
              listCountSuccess = true;
              break;
            }
          } catch (parseError) {
            console.error(`Failed to parse list count response for ${endpoint}:`, parseError);
          }
        }
      } catch (error) {
        console.error(`Error trying endpoint ${endpoint}:`, error);
      }
    }

    if (!listCountSuccess) {
      throw new Error(`All list count endpoints failed. Last response: ${listCountText || 'No response'}`);
    }

    // Step 3: Place greeting card order using the list count ID
    const pcmRequest = {
      listCountID: listCountData.id, // Use the list count ID as a number
      recordCount: recipientAddresses.length,
      mailClass: "FirstClass",
      greetingCard: order.production_combined_pdf_public_url
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
        pcmApiInteractions: {
          authentication: {
            request: {
              url: 'https://v3.pcmintegrations.com/auth/login',
              method: 'POST',
              body: authRequest
            },
            response: {
              status: authResponse.status,
              headers: Object.fromEntries(authResponse.headers.entries()),
              body: authData
            }
          },
          listCount: {
            request: {
              url: 'https://v3.pcmintegrations.com/list/count/upload',
              method: 'POST',
              body: listCountRequest
            },
            response: {
              status: listCountResponse.status,
              headers: Object.fromEntries(listCountResponse.headers.entries()),
              body: listCountData
            }
          },
          greetingCardOrder: {
            request: {
              url: pcmApiUrl,
              method: 'POST',
              body: pcmRequest
            },
            response: {
              status: pcmResponse.status,
              headers: Object.fromEntries(pcmResponse.headers.entries()),
              body: pcmResponseData
            }
          }
        }
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