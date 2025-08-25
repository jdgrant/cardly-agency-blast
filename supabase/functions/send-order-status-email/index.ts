import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = "mg.sendyourcards.io";

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

    if (!MAILGUN_API_KEY) {
      throw new Error("MAILGUN_API_KEY is not configured");
    }

    if (!requestData.contactEmail) {
      throw new Error("Contact email is required");
    }

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

    // Generate order management URL (8-character short ID)
    const shortId = orderId.replace(/-/g, '').substring(0, 8);
    const orderManagementUrl = `${req.headers.get('origin') || 'https://your-domain.com'}/#/ordermanagement/${shortId}`;

    // Create progress checklist
    const progressItems = [
      { label: "Logo Uploaded", completed: logoUploaded },
      { label: "Signature Submitted", completed: signatureSubmitted },
      { label: "Mailing List Uploaded", completed: mailingListUploaded },
      { label: "Signature Purchased", completed: signaturePurchased || false },
      { label: "Invoice Paid", completed: invoicePaid || false }
    ];

    const completedCount = progressItems.filter(item => item.completed).length;
    const progressPercentage = Math.round((completedCount / progressItems.length) * 100);

    // Create HTML email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; margin: 15px 0; }
          .progress-fill { background: #28a745; height: 100%; border-radius: 10px; transition: width 0.3s ease; }
          .checklist { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .checklist-item { display: flex; align-items: center; margin: 10px 0; }
          .checkmark { color: #28a745; margin-right: 10px; font-weight: bold; }
          .pending { color: #6c757d; margin-right: 10px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Status Update</h1>
            <p>Hello ${contactName || 'Customer'},</p>
            <p>Here's an update on your holiday card order <strong>#${readableOrderId}</strong></p>
          </div>

          <div class="progress">
            <h3>Progress: ${progressPercentage}% Complete</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
          </div>

          <div class="checklist">
            <h3>Order Checklist</h3>
            ${progressItems.map(item => `
              <div class="checklist-item">
                <span class="${item.completed ? 'checkmark' : 'pending'}">
                  ${item.completed ? '✓' : '○'}
                </span>
                <span>${item.label}</span>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderManagementUrl}" class="button">View Order Details</a>
          </div>

          <div class="footer">
            <p><strong>Current Status:</strong> ${orderStatus}</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>You can manage your order and upload any missing files by clicking the button above.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Mailgun
    const formData = new FormData();
    formData.append("from", `Holiday Cards <noreply@${MAILGUN_DOMAIN}>`);
    formData.append("to", contactEmail);
    formData.append("subject", `Order Status Update - #${readableOrderId}`);
    formData.append("html", emailHtml);

    const mailgunResponse = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
        },
        body: formData
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();
      console.error("Mailgun API error:", errorText);
      throw new Error(`Mailgun API error: ${mailgunResponse.status}`);
    }

    const mailgunResult = await mailgunResponse.json();
    console.log("Email sent successfully:", mailgunResult);

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