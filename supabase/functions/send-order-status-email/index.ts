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
    console.log("=== Email Status Function Started ===");
    const requestData: StatusEmailRequest = await req.json();
    console.log("Request data received:", JSON.stringify(requestData, null, 2));

    if (!requestData.contactEmail) {
      throw new Error("Contact email is required");
    }

    console.log("Creating status email data...");
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

    console.log("Generating order management URL...");
    const orderManagementUrl = generateOrderManagementUrl(requestData.orderId, req.headers.get('origin'));
    console.log("Order management URL:", orderManagementUrl);

    console.log("Generating email HTML...");
    const emailHtml = generateStatusEmailHtml(statusEmailData, orderManagementUrl);
    console.log("Email HTML generated successfully");

    console.log("Sending email via Mailgun...");
    const mailgunResult = await sendEmailViaMailgun({
      to: requestData.contactEmail,
      subject: `Order Status Update - #${requestData.readableOrderId}`,
      html: emailHtml
    });
    console.log("Mailgun result:", mailgunResult);

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
    console.error("=== EMAIL FUNCTION ERROR ===");
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        stack: error.stack,
        errorName: error.name
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