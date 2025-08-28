const MAILGUN_API_KEY = Deno.env.get("MAILGUN_KEY") || 
                        Deno.env.get("MAILGUN_API_KEY") || 
                        Deno.env.get("RESEND_API_KEY");
const MAILGUN_DOMAIN = "mg.sendyourcards.io";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmailViaMailgun(options: EmailOptions): Promise<any> {
  if (!MAILGUN_API_KEY) {
    throw new Error("MAILGUN_API_KEY is not configured");
  }

  const { to, subject, html, from = `Holiday Cards <noreply@${MAILGUN_DOMAIN}>` } = options;

  // Send email via Mailgun
  const formData = new FormData();
  formData.append("from", from);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

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
    console.error("Mailgun API error details:", {
      status: mailgunResponse.status,
      statusText: mailgunResponse.statusText,
      errorBody: errorText,
      domain: MAILGUN_DOMAIN,
      fromEmail: from,
      toEmail: to
    });
    throw new Error(`Mailgun API error: ${mailgunResponse.status} - ${errorText}`);
  }

  const mailgunResult = await mailgunResponse.json();
  console.log("Email sent successfully:", mailgunResult);
  
  return mailgunResult;
}

export function generateOrderManagementUrl(orderId: string, baseUrl?: string): string {
  const shortId = orderId.replace(/-/g, '').substring(0, 8);
  const domain = baseUrl || 'https://sendyourcards.io';
  return `${domain}/#/ordermanagement/${shortId}`;
}