import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request interface for the physical mailing endpoint
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
  isProduction?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { orderId, recipientAddresses, isProduction = false }: PhysicalMailingRequest = await req.json();
    
    // Input validation
    if (!orderId || typeof orderId !== 'string' || orderId.length > 100) {
      throw new Error('Invalid orderId');
    }

    if (!recipientAddresses || !Array.isArray(recipientAddresses) || recipientAddresses.length === 0 || recipientAddresses.length > 10000) {
      throw new Error('Invalid recipients array');
    }

    // Validate each recipient
    for (let i = 0; i < recipientAddresses.length; i++) {
      const recipient = recipientAddresses[i];
      const recipientNum = i + 1;
      
      if (!recipient.name || typeof recipient.name !== 'string' || recipient.name.length > 200) {
        throw new Error(`Recipient #${recipientNum}: Invalid name "${recipient.name?.substring(0, 50) || 'empty'}"`);
      }
      if (!recipient.address1 || typeof recipient.address1 !== 'string' || recipient.address1.length > 200) {
        throw new Error(`Recipient #${recipientNum} (${recipient.name}): Invalid address "${recipient.address1?.substring(0, 50) || 'empty'}"`);
      }
      if (!recipient.city || typeof recipient.city !== 'string' || recipient.city.length > 100) {
        throw new Error(`Recipient #${recipientNum} (${recipient.name}): Invalid city "${recipient.city?.substring(0, 50) || 'empty'}"`);
      }
      if (!recipient.state || typeof recipient.state !== 'string' || recipient.state.length > 2) {
        throw new Error(`Recipient #${recipientNum} (${recipient.name}): Invalid state "${recipient.state}" - must be 2-letter abbreviation (e.g., CA, NY)`);
      }
      if (!recipient.zip || typeof recipient.zip !== 'string' || recipient.zip.length > 10) {
        throw new Error(`Recipient #${recipientNum} (${recipient.name}): Invalid zip "${recipient.zip?.substring(0, 10) || 'empty'}"`);
      }
    }
    
    console.log(`Sending physical greeting cards for order: ${orderId} in ${isProduction ? 'PRODUCTION' : 'SANDBOX'} mode`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get PCM API credentials based on production mode
    const pcmApiKey = isProduction 
      ? Deno.env.get('PCM_PRODUCTION_API_KEY')
      : Deno.env.get('PCM_API_KEY');
    const pcmApiSecret = isProduction 
      ? Deno.env.get('PCM_PRODUCTION_API_SECRET')
      : Deno.env.get('PCM_API_SECRET');
    
    if (!pcmApiKey || !pcmApiSecret) {
      throw new Error('PCM_API_KEY and PCM_API_SECRET must be configured in environment variables');
    }

    // Step 1: Authenticate with PCM to get bearer token
    console.log('=== PCM AUTHENTICATION ===');
    console.log('URL:', 'https://v3.pcmintegrations.com/auth/login');
    const authRequest = {
      apiKey: pcmApiKey,
      apiSecret: pcmApiSecret,
      isSandbox: !isProduction // Use production mode based on toggle
    };
    console.log('Request Packet:', JSON.stringify(authRequest, null, 2));
    
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

    // Fetch order details including card previews and return address
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

    // Use stored drop_date from database instead of calculating
    let mailDate = '';
    if (order.drop_date) {
      mailDate = order.drop_date;
      console.log(`Using stored drop date: ${mailDate}`);
    } else {
      console.log('No drop date found in order, using fallback calculation');
      // Fallback calculation if drop_date is not set
      const year = new Date().getFullYear();
      const mailingWindowMap: Record<string, string> = {
        'dec-1-5': `${year}-11-29`,
        'dec-6-10': `${year}-12-04`,
        'dec-11-15': `${year}-12-09`,
        'dec-16-20': `${year}-12-14`
      };
      mailDate = mailingWindowMap[order.mailing_window] || '';
    }

    // Step 2: Group recipients by drop date and send separate batches
    console.log('=== GROUPING RECIPIENTS BY DROP DATE FOR SEPARATE BATCHES ===');
    
    // Group recipients by their drop dates (assuming all recipients for this order have same drop date)
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

    console.log(`Creating batch for drop date: ${mailDate} with ${recipients.length} recipients`);
    
    // Create unique batch identifier with timestamp to prevent PCM auto-grouping
    const uniqueBatchId = `${order.readable_order_id}-${mailDate}-${Date.now()}`;
    console.log(`Using unique batch name: ${uniqueBatchId}`);

    // Prepare return address from order data
    const returnAddress = {
      name: order.return_address_name || 'Default Sender',
      address: order.return_address_line1 || '',
      address2: order.return_address_line2 || '',
      city: order.return_address_city || '',
      state: order.return_address_state || '',
      zipCode: order.return_address_zip || ''
    };

    // Map postage option to PCM MailClass (normalize variants)
    const normalizedPostage = String(order.postage_option || '').toLowerCase().replace(/[\s_-]/g, '');
    const mailClass = normalizedPostage.startsWith('first') ? 'FirstClass' : 'Standard';

    // Try different greeting card order approaches
    const greetingCardEndpoints = [
      {
        url: 'https://v3.pcmintegrations.com/order/greeting-card',
        payload: {
          recipients: recipients,
          recordCount: recipientAddresses.length,
          mailClass: mailClass,
          mailDate: mailDate,
          greetingCard: order.production_combined_pdf_public_url,
          returnAddress: returnAddress,
          batchName: uniqueBatchId, // Unique batch naming by drop date + timestamp
          addOns: [
            {
              "addon": "Livestamping"
            }
          ]
        }
      },
      {
        url: 'https://v3.pcmintegrations.com/order/greeting-card/with-recipients',
        payload: {
          recipients: recipients,
          recordCount: recipientAddresses.length,
          mailClass: mailClass, 
          mailDate: mailDate,
          greetingCard: order.production_combined_pdf_public_url,
          returnAddress: returnAddress,
          batchName: uniqueBatchId, // Unique batch naming by drop date + timestamp
          addOns: [
            {
              "addon": "Livestamping"
            }
          ]
        }
      },
      {
        url: 'https://v3.pcmintegrations.com/order/greeting-card/with-list-count',
        payload: {
          recipients: recipients,
          recordCount: recipientAddresses.length,
          mailClass: mailClass,
          mailDate: mailDate,
          greetingCard: order.production_combined_pdf_public_url,
          returnAddress: returnAddress,
          listCountID: 0, // Try with 0 as dummy value
          batchName: uniqueBatchId, // Unique batch naming by drop date + timestamp
          addOns: [
            {
              "addon": "Livestamping"
            }
          ]
        }
      }
    ];

    let pcmResponse;
    let pcmResponseData;
    let responseText;
    let success = false;
    let successfulEndpoint = null;

    for (const [index, endpoint] of greetingCardEndpoints.entries()) {
      try {
        console.log(`=== TRYING GREETING CARD ENDPOINT ===`);
        console.log('URL:', endpoint.url);
        console.log('Request Packet:', JSON.stringify(endpoint.payload, null, 2));

        pcmResponse = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authData.token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(endpoint.payload)
        });

        responseText = await pcmResponse.text();
        console.log('Response Status:', pcmResponse.status);
        console.log('Response Headers:', Object.fromEntries(pcmResponse.headers.entries()));
        console.log('Response Body:', responseText);

        if (pcmResponse.ok) {
          try {
            pcmResponseData = responseText ? JSON.parse(responseText) : {};
            console.log('✅ Greeting card order successful!');
            success = true;
            successfulEndpoint = endpoint;
            break;
          } catch (parseError) {
            console.error('Failed to parse response:', parseError);
          }
        } else {
          console.log(`❌ Endpoint ${endpoint.url} failed with status ${pcmResponse.status}`);
        }
      } catch (error) {
        console.error(`❌ Error trying endpoint ${endpoint.url}:`, error);
      }
    }

    if (!success) {
      throw new Error(`All greeting card endpoints failed. Last response: ${responseText || 'No response'}`);
    }
    
    try {
      pcmResponseData = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('Failed to parse PCM response as JSON:', parseError);
      throw new Error(`PCM API returned invalid JSON. Status: ${pcmResponse?.status || 'unknown'}, Response: ${responseText}`);
    }
    
    console.log('PCM API parsed response:', JSON.stringify(pcmResponseData, null, 2));

    if (pcmResponse && !pcmResponse.ok) {
      throw new Error(`PCM API error: ${pcmResponse.status} - ${JSON.stringify(pcmResponseData)}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Physical greeting cards submitted to PCM DirectMail for ${recipientAddresses.length} recipients`,
        pcmOrderId: pcmResponseData.orderID,
        pcmBatchId: pcmResponseData.batchID,
        pcmOrderResponse: pcmResponseData,
        apiInteractions: {
          authentication: {
            request: {
              url: 'https://v3.pcmintegrations.com/auth/login',
              method: 'POST',
              body: authRequest
            },
            response: {
              status: authResponse.status,
              body: authData
            }
          },
          greetingCardOrder: {
            request: {
              url: successfulEndpoint?.url || 'unknown',
              method: 'POST', 
              body: successfulEndpoint?.payload || {}
            },
            response: {
              status: pcmResponse?.status || 0,
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

Deno.serve(handler);