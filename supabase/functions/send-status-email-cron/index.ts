import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to upload base64 image to storage and return public URL
async function uploadBase64ToStorage(base64Data: string, orderId: string, type: 'front' | 'inside'): Promise<string | undefined> {
  try {
    // Remove data:image/png;base64, prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    // Create filename
    const fileName = `email-previews/${orderId}-${type}-preview.png`;
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from('holiday-cards')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error(`Failed to upload ${type} preview for order ${orderId}:`, error);
      return undefined;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('holiday-cards')
      .getPublicUrl(fileName);
    
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error(`Error uploading ${type} preview for order ${orderId}:`, error);
    return undefined;
  }
}

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
      .not('contact_email', 'is', null)
      .neq('invoice_paid', true); // Skip orders with paid invoices for cron emails

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

        // Convert base64 images to hosted URLs for email compatibility
        let frontPreviewUrl: string | undefined;
        let insidePreviewUrl: string | undefined;
        
        if (order.front_preview_base64) {
          frontPreviewUrl = await uploadBase64ToStorage(order.front_preview_base64, order.id, 'front');
        }
        
        if (order.inside_preview_base64) {
          insidePreviewUrl = await uploadBase64ToStorage(order.inside_preview_base64, order.id, 'inside');
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
            signatureSubmitted: !!order.signature_url || !!order.cropped_signature_url,
            mailingListUploaded: !!order.csv_file_url,
            signaturePurchased: order.signature_purchased,
            invoicePaid: order.invoice_paid,
            frontPreviewUrl,
            insidePreviewUrl
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