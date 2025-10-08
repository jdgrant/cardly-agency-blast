import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { sendEmailViaMailgun, generateOrderManagementUrl } from "../_shared/mailgun-client.ts";
import { generateReceiptEmailHtml, ReceiptEmailData } from "../_shared/email-templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptEmailRequest {
  orderId: string;
  contactEmail: string;
  contactName: string;
  readableOrderId: string;
  finalPrice: number;
  cardQuantity: number;
  mailingWindow: string;
  frontPreviewUrl?: string;
  insidePreviewUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== RECEIPT EMAIL FUNCTION START ===");
    
    const requestData: ReceiptEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(requestData, null, 2));

    const { 
      orderId, 
      contactEmail, 
      contactName,
      readableOrderId,
      finalPrice,
      cardQuantity,
      mailingWindow,
      frontPreviewUrl,
      insidePreviewUrl
    } = requestData;

    if (!contactEmail) {
      throw new Error("Contact email is required");
    }

    // Format mailing window for display
    const formatMailingWindow = (window: string) => {
      const windows: Record<string, string> = {
        'dec-1-5': 'December 1-5',
        'dec-6-10': 'December 6-10',
        'dec-11-15': 'December 11-15',
        'dec-16-20': 'December 16-20'
      };
      return windows[window] || window;
    };

    // Prepare email data
    const emailData: ReceiptEmailData = {
      orderId,
      contactEmail,
      contactName,
      readableOrderId,
      finalPrice,
      cardQuantity,
      mailingWindow: formatMailingWindow(mailingWindow),
      frontPreviewUrl,
      insidePreviewUrl
    };

    // Generate order management URL
    const orderManagementUrl = generateOrderManagementUrl(orderId);

    // Generate HTML email
    const emailHtml = generateReceiptEmailHtml(emailData, orderManagementUrl);

    // Send email
    console.log("Sending receipt email to:", contactEmail);
    const emailResult = await sendEmailViaMailgun({
      to: contactEmail,
      subject: `Payment Received - Order #${readableOrderId}`,
      html: emailHtml,
    });

    console.log("Receipt email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        mailgunId: emailResult.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error("Error in receipt email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
