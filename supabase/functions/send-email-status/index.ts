import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { generateStatusEmailHtml, StatusEmailData } from "../_shared/email-templates.ts";
import { sendEmailViaMailgun, generateOrderManagementUrl } from "../_shared/mailgun-client.ts";

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
  frontPreviewUrl?: string;
  insidePreviewUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== NEW EMAIL FUNCTION START ===");
    const requestData: StatusEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(requestData, null, 2));

    // Try multiple ways to get the API key
    const mailgunKey = Deno.env.get('MAILGUN_KEY') || 
                       Deno.env.get('MAILGUN_API_KEY') || 
                       Deno.env.get('RESEND_API_KEY'); // fallback
    
    console.log("Available keys:", {
      mailgunKey: !!Deno.env.get('MAILGUN_KEY'),
      mailgunApiKey: !!Deno.env.get('MAILGUN_API_KEY'),
      resendKey: !!Deno.env.get('RESEND_API_KEY')
    });

    if (!mailgunKey) {
      throw new Error('No email API key found');
    }

    const { 
      orderId,
      contactEmail, 
      contactName, 
      readableOrderId, 
      orderStatus,
      logoUploaded, 
      signatureSubmitted, 
      mailingListUploaded,
      signaturePurchased,
      invoicePaid,
      frontPreviewUrl,
      insidePreviewUrl
    } = requestData;

    if (!contactEmail) {
      throw new Error('Contact email is required');
    }

    // Generate order management URL
    const orderManagementUrl = generateOrderManagementUrl(orderId);

    // Prepare data for email template
    const emailData: StatusEmailData = {
      orderId,
      orderStatus,
      contactEmail,
      contactName,
      readableOrderId,
      logoUploaded,
      signatureSubmitted,
      mailingListUploaded,
      signaturePurchased,
      invoicePaid,
      frontPreviewUrl,
      insidePreviewUrl
    };

    // Generate HTML using shared template
    const emailHtml = generateStatusEmailHtml(emailData, orderManagementUrl);

    console.log("Preparing to send email to:", contactEmail);
    
    // Send email using shared client
    const mailgunResult = await sendEmailViaMailgun({
      to: contactEmail,
      subject: `SendYourCards.io Order Update: ${readableOrderId}`,
      html: emailHtml
    });
    console.log("Email sent successfully:", mailgunResult);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Order status email sent to ${contactEmail}`,
        mailgunId: mailgunResult.id
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
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        stack: error.stack
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