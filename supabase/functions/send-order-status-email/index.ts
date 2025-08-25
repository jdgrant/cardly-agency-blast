import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { generateStatusEmailHtml, StatusEmailData } from '../_shared/email-templates.ts';
import { sendEmailViaMailgun, generateOrderManagementUrl } from '../_shared/mailgun-client.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusEmailRequest {
  orderId: string;
  orderStatus: string;
  contactEmail: string;
  contactName: string;
  readableOrderId: string;
  logoUploaded: boolean;
  signatureSubmitted: boolean;
  mailingListUploaded: boolean;
  signaturePurchased?: boolean;
  invoicePaid?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: StatusEmailRequest = await req.json();
    console.log("Sending status email for order:", requestData.orderId);

    if (!requestData.contactEmail) {
      throw new Error("Contact email is required");
    }

    const statusEmailData: StatusEmailData = {
      orderId: requestData.orderId,
      orderStatus: requestData.orderStatus,
      contactEmail: requestData.contactEmail,
      contactName: requestData.contactName,
      readableOrderId: requestData.readableOrderId,
      logoUploaded: requestData.logoUploaded,
      signatureSubmitted: requestData.signatureSubmitted,
      mailingListUploaded: requestData.mailingListUploaded,
      signaturePurchased: requestData.signaturePurchased,
      invoicePaid: requestData.invoicePaid
    };

    const orderManagementUrl = generateOrderManagementUrl(requestData.orderId, req.headers.get('origin'));
    const emailHtml = generateStatusEmailHtml(statusEmailData, orderManagementUrl);

    const mailgunResult = await sendEmailViaMailgun({
      to: requestData.contactEmail,
      subject: `Order Status Update - #${requestData.readableOrderId}`,
      html: emailHtml
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: mailgunResult.id,
        message: "Status email sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error sending status email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);