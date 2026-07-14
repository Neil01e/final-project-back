import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function sendReplyEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@raccoongaming.com",
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🦝 Raccoon Gaming</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Support Response</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi <strong>${recipientName}</strong>,</p>
            
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #374151;">
              ${message}
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
              Best regards,<br/>
              <strong>Raccoon Gaming Support Team</strong>
            </p>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">© 2024 Raccoon Gaming. All rights reserved.</p>
            <p style="margin: 5px 0 0 0;">
              📧 support@raccoongaming.com | 📞 +1 (555) 123-4567
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendContactConfirmationEmail(
  recipientEmail: string,
  recipientName: string
): Promise<boolean> {
  try {
    const msg = {
      to: recipientEmail,
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@raccoongaming.com",
      subject: "We received your message - Raccoon Gaming",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a855f7 0%, #d946ef 100%); padding: 20px; color: white; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🦝 Raccoon Gaming</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Message Received</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi <strong>${recipientName}</strong>,</p>
            
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #374151;">
              Thank you for reaching out to Raccoon Gaming! We've received your message and our support team will get back to you as soon as possible.
            </p>
            
            <p style="margin: 0 0 20px 0; line-height: 1.6; color: #374151;">
              <strong>Response time:</strong> We typically reply within 24 hours during business days.
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
              Best regards,<br/>
              <strong>Raccoon Gaming Support Team</strong>
            </p>
          </div>
          
          <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0;">© 2024 Raccoon Gaming. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return false;
  }
}