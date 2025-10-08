export interface StatusEmailData {
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

export interface ReceiptEmailData {
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

export function generateReceiptEmailHtml(data: ReceiptEmailData, orderManagementUrl: string): string {
  const { 
    contactName, 
    readableOrderId,
    finalPrice,
    cardQuantity,
    mailingWindow,
    frontPreviewUrl,
    insidePreviewUrl
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Thank You for Your Order</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .thank-you { color: #28a745; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
        .order-summary { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
      </style>
    </head>
    <body>
      <div class="container">
        ${(frontPreviewUrl || insidePreviewUrl) ? `
        <div style="text-align: center; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="margin: 0 0 20px 0; color: #333;">Your Card Preview</h2>
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            ${frontPreviewUrl ? `
            <div style="text-align: center;">
              <h4 style="margin: 0 0 10px 0; color: #666;">Card Front</h4>
              <img src="${frontPreviewUrl}" alt="Card Front Preview" style="max-width: 250px; max-height: 200px; border: 2px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
            ` : ''}
            ${insidePreviewUrl ? `
            <div style="text-align: center;">
              <h4 style="margin: 0 0 10px 0; color: #666;">Card Inside</h4>
              <img src="${insidePreviewUrl}" alt="Card Inside Preview" style="max-width: 250px; max-height: 200px; border: 2px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        <div class="header">
          <div class="thank-you">Thank You for Your Order!</div>
          <p>Hello ${contactName || 'Customer'},</p>
          <p>We have received your payment and your holiday card order is now confirmed.</p>
        </div>

        <div class="order-summary">
          <h3 style="margin-top: 0;">Order Summary</h3>
          <div class="summary-row">
            <span>Order Number:</span>
            <span><strong>#${readableOrderId}</strong></span>
          </div>
          <div class="summary-row">
            <span>Card Quantity:</span>
            <span>${cardQuantity} cards</span>
          </div>
          <div class="summary-row">
            <span>Mailing Window:</span>
            <span>${mailingWindow}</span>
          </div>
          <div class="summary-row">
            <span>Total Paid:</span>
            <span style="color: #28a745;"><strong>$${finalPrice.toFixed(2)}</strong></span>
          </div>
        </div>

        <div style="background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #004085;">What's Next?</h4>
          <p style="margin: 0; color: #004085;">
            Your order is now being processed. We'll send you updates as your cards move through production 
            and get ready to mail. You can check your order status anytime by clicking the button below.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderManagementUrl}" class="button" style="display: inline-block; background: #007bff; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Order Status</a>
        </div>

        <div class="footer">
          <p>Questions? Reply to this email or contact us at support@sendyourcards.io</p>
          <p><strong>SendYourCards.io</strong><br>
          Professional Holiday Card Services<br>
          This is your payment receipt for order #${readableOrderId}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateStatusEmailHtml(data: StatusEmailData, orderManagementUrl: string, unsubscribeUrl?: string): string {
  const { 
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
  } = data;

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

  return `
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
        ${(frontPreviewUrl || insidePreviewUrl) ? `
        <div style="text-align: center; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="margin: 0 0 20px 0; color: #333;">Your Card Preview</h2>
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            ${frontPreviewUrl ? `
            <div style="text-align: center;">
              <h4 style="margin: 0 0 10px 0; color: #666;">Card Front</h4>
              <img src="${frontPreviewUrl}" alt="Card Front Preview" style="max-width: 250px; max-height: 200px; border: 2px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
            ` : ''}
            ${insidePreviewUrl ? `
            <div style="text-align: center;">
              <h4 style="margin: 0 0 10px 0; color: #666;">Card Inside</h4>
              <img src="${insidePreviewUrl}" alt="Card Inside Preview" style="max-width: 250px; max-height: 200px; border: 2px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        <div class="header">
          <h1>Your Holiday Card Order Update</h1>
          <p>Hello ${contactName || 'Customer'},</p>
          <p>We wanted to update you on your holiday card order <strong>#${readableOrderId}</strong> from SendYourCards.io</p>
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
          <a href="${orderManagementUrl}" class="button" style="display: inline-block; background: #007bff; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Order Details</a>
        </div>

        <div class="footer">
          <p><strong>Current Status:</strong> ${orderStatus}</p>
          <p>Questions? Reply to this email or contact us at support@sendyourcards.io</p>
          <p>You can manage your order and upload any missing files by clicking the button above.</p>
          <p><strong>SendYourCards.io</strong><br>
          Professional Holiday Card Services<br>
          This email was sent regarding your order #${readableOrderId}</p>
          ${unsubscribeUrl ? `
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          <p style="font-size: 12px; color: #888;">
            Don't want to receive these order status updates? 
            <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe here</a>
          </p>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}