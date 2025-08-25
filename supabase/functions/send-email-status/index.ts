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
      invoicePaid 
    } = requestData;

    if (!contactEmail) {
      throw new Error('Contact email is required');
    }

    // Create status checklist HTML to match customer management page
    const createCheckItem = (label: string, isComplete: boolean) => 
      `<div style="display: flex; align-items: center; margin: 12px 0; padding: 8px; background: ${isComplete ? '#f0fdf4' : '#f9fafb'}; border-radius: 6px;">
        <div style="width: 20px; height: 20px; margin-right: 12px;">
          ${isComplete 
            ? '<div style="background: #10b981; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">✓</div>'
            : '<div style="background: #d1d5db; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 12px;">⏳</div>'
          }
        </div>
        <span style="color: ${isComplete ? '#059669' : '#6b7280'}; font-weight: ${isComplete ? '600' : '400'};">${label}</span>
      </div>`;

    // Calculate progress like the customer management page
    let completed = 0;
    const total = 4;
    
    if (logoUploaded) completed++;
    if (signatureSubmitted) completed++;
    if (mailingListUploaded) completed++;
    if (invoicePaid) completed++;
    
    const progressPercentage = Math.round((completed / total) * 100);

    // Generate order management URL
    const shortId = orderId.replace(/-/g, '').substring(0, 8);
    const orderManagementUrl = `https://sendyourcards.io/#/ordermanagement/${shortId}`;

    const statusHtml = `
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0; margin-bottom: 16px;">Order Progress (${progressPercentage}% Complete)</h3>
        
        <!-- Progress Bar -->
        <div style="background: #f3f4f6; height: 8px; border-radius: 4px; margin-bottom: 20px;">
          <div style="background: #10b981; height: 8px; border-radius: 4px; width: ${progressPercentage}%;"></div>
        </div>
        
        <!-- Progress Steps -->
        ${createCheckItem('Logo Upload', logoUploaded)}
        ${createCheckItem('Signature Submitted', signatureSubmitted)}
        ${createCheckItem('Client List Upload', mailingListUploaded)}
        ${createCheckItem('Payment Completed', invoicePaid || false)}
      </div>
    `;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #059669; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">SendYourCards.io</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Your Holiday Card Order Update</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${contactName},</p>
          
          <p style="margin: 0 0 20px 0;">Your holiday card order <strong>${readableOrderId}</strong> needs your attention to complete the setup process.</p>
          
          <!-- Status and Progress -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 18px;">Current Status: <span style="color: #059669;">${orderStatus.toUpperCase()}</span></h3>
            ${statusHtml}
          </div>
          
          ${progressPercentage < 100 ? `
          <!-- Call to Action -->
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
            <h4 style="color: #92400e; margin: 0 0 12px 0;">⚠️ Action Required</h4>
            <p style="color: #92400e; margin: 0 0 16px 0;">Your order is <strong>${100 - progressPercentage}%</strong> away from completion. Please complete the remaining steps to process your order.</p>
            <a href="${orderManagementUrl}" 
               style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 8px;">
              Complete Your Order →
            </a>
          </div>
          ` : `
          <!-- Completion Message -->
          <div style="background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
            <h4 style="color: #065f46; margin: 0 0 12px 0;">✅ Order Complete!</h4>
            <p style="color: #065f46; margin: 0 0 16px 0;">All steps are complete. Your order is now being processed.</p>
            <a href="${orderManagementUrl}" 
               style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 8px;">
              View Order Details →
            </a>
          </div>
          `}
          
          <p style="margin: 24px 0 16px 0;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p style="margin: 0;">Best regards,<br>
          <strong>The SendYourCards.io Team</strong></p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
            This is an automated message regarding your order ${readableOrderId}.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            <a href="${orderManagementUrl}" style="color: #059669; text-decoration: none;">Manage Your Order</a> | 
            <a href="https://sendyourcards.io" style="color: #059669; text-decoration: none;">SendYourCards.io</a>
          </p>
        </div>
      </div>
    `;

    console.log("Preparing to send email to:", contactEmail);
    
    // Send email using Mailgun API
    const formData = new FormData();
    formData.append('from', 'SendYourCards.io <noreply@mg.sendyourcards.io>');
    formData.append('to', contactEmail);
    formData.append('subject', `SendYourCards.io Order Update: ${readableOrderId}`);
    formData.append('html', emailHtml);

    const mailgunResponse = await fetch('https://api.mailgun.net/v3/mg.sendyourcards.io/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${mailgunKey}`)}`
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