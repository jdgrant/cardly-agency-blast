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
}

export function generateStatusEmailHtml(data: StatusEmailData, orderManagementUrl: string): string {
  const { 
    contactName, 
    readableOrderId,
    orderStatus,
    logoUploaded,
    signatureSubmitted,
    mailingListUploaded,
    signaturePurchased,
    invoicePaid
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
}