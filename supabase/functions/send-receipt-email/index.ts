import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { sendEmailViaMailgun, generateOrderManagementUrl } from "../_shared/mailgun-client.ts";
import { generateReceiptEmailHtml, ReceiptEmailData } from "../_shared/email-templates.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Upload base64 image to Supabase Storage and return public URL
async function uploadBase64ToStorage(base64Data: string, orderId: string, type: 'front' | 'inside'): Promise<string | undefined> {
  if (!base64Data) return undefined;
  
  try {
    // Extract base64 content
    const base64Content = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;
    
    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
    
    // Upload to storage
    const fileName = `email-previews/${orderId}-${type}-${Date.now()}.png`;
    const { data, error } = await supabase.storage
      .from('holiday-cards')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (error) {
      console.error(`Error uploading ${type} preview:`, error);
      return undefined;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('holiday-cards')
      .getPublicUrl(fileName);
    
    console.log(`${type} preview uploaded:`, publicUrl);
    return publicUrl;
  } catch (error) {
    console.error(`Error processing ${type} preview:`, error);
    return undefined;
  }
}

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

    // Upload preview images to storage if provided as base64
    let storageFrontUrl = frontPreviewUrl;
    let storageInsideUrl = insidePreviewUrl;
    
    if (frontPreviewUrl && frontPreviewUrl.startsWith('data:')) {
      storageFrontUrl = await uploadBase64ToStorage(frontPreviewUrl, orderId, 'front');
    }
    
    if (insidePreviewUrl && insidePreviewUrl.startsWith('data:')) {
      storageInsideUrl = await uploadBase64ToStorage(insidePreviewUrl, orderId, 'inside');
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

    // Prepare email data with storage URLs
    const emailData: ReceiptEmailData = {
      orderId,
      contactEmail,
      contactName,
      readableOrderId,
      finalPrice,
      cardQuantity,
      mailingWindow: formatMailingWindow(mailingWindow),
      frontPreviewUrl: storageFrontUrl,
      insidePreviewUrl: storageInsideUrl
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
