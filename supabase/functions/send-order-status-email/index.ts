import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    console.log("=== EMAIL FUNCTION TEST START ===");
    const requestData: StatusEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(requestData, null, 2));

    // For now, just simulate success without actually sending email
    console.log("Function is working correctly!");
    console.log("Would send email to:", requestData.contactEmail);
    console.log("Order ID:", requestData.orderId);
    console.log("Contact name:", requestData.contactName);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email function is working! (Test mode - no email actually sent)",
        testData: {
          orderId: requestData.orderId,
          contactEmail: requestData.contactEmail,
          orderStatus: requestData.orderStatus
        }
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