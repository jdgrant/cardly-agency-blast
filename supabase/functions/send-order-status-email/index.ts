import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_KEY') || Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = 'mg.sendyourcards.io';

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
    console.log("=== EMAIL FUNCTION START ===");
    console.log("Environment check:");
    console.log("- MAILGUN_API_KEY present:", !!MAILGUN_API_KEY);
    console.log("- MAILGUN_API_KEY length:", MAILGUN_API_KEY ? MAILGUN_API_KEY.length : 0);
    console.log("- All env vars:", Object.keys(Deno.env.toObject()).filter(k => k.includes('MAILGUN')));
    
    const requestData: StatusEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(requestData, null, 2));

    const { 
      orderId, 
      orderStatus, 
      contactEmail, 
      contactName, 
      readableOrderId, 
      logoUploaded, 
      signatureSubmitted, 
      mailingListUploaded,
      signaturePurchased,
      invoicePaid 
    } = requestData;

    if (!contactEmail) {
      throw new Error('Contact email is required');
    }

    // Create status checklist HTML
    const createCheckItem = (label: string, isComplete: boolean) => 
      `<li style="margin: 8px 0; color: ${isComplete ? '#10b981' : '#6b7280'};">
        ${isComplete ? '✅' : '⏳'} ${label}
      </li>`;

    const statusHtml = `
      <ul style="list-style: none; padding: 0; margin: 16px 0;">
        ${createCheckItem('Logo uploaded', logoUploaded)}
        ${createCheckItem('Signature submitted', signatureSubmitted)}
        ${createCheckItem('Mailing list uploaded', mailingListUploaded)}
        ${signaturePurchased !== undefined ? createCheckItem('Signature purchased', signaturePurchased) : ''}
        ${invoicePaid !== undefined ? createCheckItem('Invoice paid', invoicePaid) : ''}
      </ul>
    `;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Holiday Card Order Update</h2>
        
        <p>Hi ${contactName},</p>
        
        <p>Here's an update on your holiday card order <strong>${readableOrderId}</strong>:</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Current Status: <span style="color: #059669;">${orderStatus.toUpperCase()}</span></h3>
          
          <h4 style="color: #374151;">Order Progress:</h4>
          ${statusHtml}
        </div>
        
        <p>If you have any questions or need to make changes to your order, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        The Holiday Cards Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated message regarding your order ${readableOrderId}. 
          If you received this email in error, please disregard it.
        </p>
      </div>
    `;

    console.log("Preparing to send email to:", contactEmail);
    console.log("MAILGUN_API_KEY available:", !!MAILGUN_API_KEY);

    if (!MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY not configured');
    }

    // Send email using Mailgun directly
    const formData = new FormData();
    formData.append('from', 'Holiday Cards <noreply@mg.sendyourcards.io>');
    formData.append('to', contactEmail);
    formData.append('subject', `Order Update: ${readableOrderId} - ${orderStatus.toUpperCase()}`);
    formData.append('html', emailHtml);

    const mailgunResponse = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
      },
      body: formData
    });

    console.log("Mailgun response status:", mailgunResponse.status);
    
    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error("Mailgun error response:", errorText);
      throw new Error(`Mailgun API error: ${mailgunResponse.status} - ${errorText}`);
    }

    const mailgunResult = await mailgunResponse.json();

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