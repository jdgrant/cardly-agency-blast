import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import { generateStatusEmailHtml, StatusEmailData } from "../_shared/email-templates.ts";
import { sendEmailViaMailgun, generateOrderManagementUrl } from "../_shared/mailgun-client.ts";

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
    console.log("=== EMAIL STATUS FUNCTION START ===");
    const requestData: StatusEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(requestData, null, 2));

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

    console.log("Card preview URLs:", {
      frontPreviewUrl: frontPreviewUrl ? "present" : "missing",
      insidePreviewUrl: insidePreviewUrl ? "present" : "missing"
    });

    // Convert base64 images to hosted URLs for email compatibility
    let processedFrontPreviewUrl: string | undefined;
    let processedInsidePreviewUrl: string | undefined;
    
    if (frontPreviewUrl && frontPreviewUrl.startsWith('data:image/')) {
      processedFrontPreviewUrl = await uploadBase64ToStorage(frontPreviewUrl, orderId, 'front');
    } else {
      processedFrontPreviewUrl = frontPreviewUrl;
    }
    
    if (insidePreviewUrl && insidePreviewUrl.startsWith('data:image/')) {
      processedInsidePreviewUrl = await uploadBase64ToStorage(insidePreviewUrl, orderId, 'inside');
    } else {
      processedInsidePreviewUrl = insidePreviewUrl;
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
      frontPreviewUrl: processedFrontPreviewUrl,
      insidePreviewUrl: processedInsidePreviewUrl
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