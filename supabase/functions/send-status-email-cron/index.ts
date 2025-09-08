import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CronEmailRequest {
  ordersToEmail?: string[]; // Optional array of order IDs to email
  statusFilter?: string; // Optional status filter (e.g., 'pending', 'approved')
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: CronEmailRequest = await req.json().catch(() => ({}));
    console.log("Cron email job started:", requestData);

    // Query orders that need status emails
    let query = supabase
      .from('orders')
      .select('*')
      .not('contact_email', 'is', null);

    // Apply filters if provided
    if (requestData.ordersToEmail && requestData.ordersToEmail.length > 0) {
      query = query.in('id', requestData.ordersToEmail);
    }

    if (requestData.statusFilter) {
      if (requestData.statusFilter === 'not_completed') {
        // Filter for orders that are not completed
        query = query.neq('status', 'completed');
      } else {
        query = query.eq('status', requestData.statusFilter);
      }
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log("No orders found matching criteria");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No orders found matching criteria",
          emailsSent: 0
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing ${orders.length} orders for status emails`);

    const emailResults = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each order by calling the same send-email-status function
    for (const order of orders) {
      try {
        // Check if email is unsubscribed
        const { data: unsubscribed, error: unsubError } = await supabase
          .from('email_unsubscribes')
          .select('email')
          .eq('email', order.contact_email)
          .single();

        if (unsubError && unsubError.code !== 'PGRST116') {
          console.error(`Error checking unsubscribe status for ${order.contact_email}:`, unsubError);
        }

        if (unsubscribed) {
          console.log(`Skipping unsubscribed email: ${order.contact_email}`);
          emailResults.push({
            orderId: order.id,
            success: true,
            skipped: true,
            reason: 'unsubscribed'
          });
          continue;
        }

        // Use the same send-email-status function to ensure identical emails
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email-status', {
          body: {
            orderId: order.id,
            orderStatus: order.status,
            contactEmail: order.contact_email,
            contactName: `${order.contact_firstname || ''} ${order.contact_lastname || ''}`.trim() || 'Customer',
            readableOrderId: order.readable_order_id || order.id.slice(0, 8),
            logoUploaded: !!order.logo_url,
            signatureSubmitted: !!order.signature_url,
            mailingListUploaded: !!order.csv_file_url,
            signaturePurchased: order.signature_purchased,
            invoicePaid: order.invoice_paid,
            frontPreviewUrl: order.front_preview_base64 ? `data:image/png;base64,${order.front_preview_base64}` : undefined,
            insidePreviewUrl: order.inside_preview_base64 ? `data:image/png;base64,${order.inside_preview_base64}` : undefined
          }
        });

        if (emailError) {
          throw emailError;
        }

        emailResults.push({
          orderId: order.id,
          success: true,
          messageId: emailResult?.mailgunId
        });
        successCount++;

        console.log(`Email sent successfully for order ${order.id}`);

      } catch (error: any) {
        console.error(`Failed to send email for order ${order.id}:`, error);
        emailResults.push({
          orderId: order.id,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    console.log(`Cron email job completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${orders.length} orders. Sent: ${successCount}, Failed: ${errorCount}`,
        emailsSent: successCount,
        emailsFailed: errorCount,
        results: emailResults
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in cron email job:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);