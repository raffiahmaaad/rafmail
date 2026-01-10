/**
 * Email notification utilities using Resend API
 * Professional email templates inspired by modern tech companies
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "raffi.ahmaaaddd@gmail.com";
const FROM_EMAIL = "RafMail <noreply@rafmail.web.id>";
const APP_URL = process.env.BETTER_AUTH_URL || "https://rafmail.web.id";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using Resend API
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] Skipped - RESEND_API_KEY not configured`);
    console.log(`[Email] Would send to: ${options.to}`);
    console.log(`[Email] Subject: ${options.subject}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      console.error("[Email] Failed to send:", await response.text());
      return false;
    }

    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Error sending:", error);
    return false;
  }
}

/**
 * Modern professional email template
 */
function emailTemplate(options: {
  preheader?: string;
  heroIcon?: string;
  heroColor?: string;
  title: string;
  subtitle?: string;
  content: string;
  buttonUrl?: string;
  buttonText?: string;
  buttonColor?: string;
  footerNote?: string;
}): string {
  const {
    preheader = "",
    heroIcon = "📧",
    heroColor = "#6366f1",
    title,
    subtitle,
    content,
    buttonUrl,
    buttonText,
    buttonColor = "#6366f1",
    footerNote,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button {padding: 14px 28px !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, ${heroColor} 0%, ${heroColor}dd 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">${heroIcon}</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
              ${subtitle ? `<p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 400;">${subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="color: #3f3f46; font-size: 15px; line-height: 1.7;">
                ${content}
              </div>

              ${buttonUrl && buttonText ? `
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td>
                    <a href="${buttonUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: ${buttonColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; transition: background-color 0.2s;">
                      ${buttonText} →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              ${footerNote ? `
              <p style="margin: 24px 0 0; padding-top: 24px; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 13px; line-height: 1.6;">
                ${footerNote}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e4e4e7;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #18181b; font-size: 14px; font-weight: 600;">RafMail</p>
                    <p style="margin: 0; color: #71717a; font-size: 12px;">Secure Disposable Email Service</p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; padding-top: 16px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 11px;">
                      © ${new Date().getFullYear()} RafMail. All rights reserved.<br>
                      <a href="${APP_URL}" style="color: #6366f1; text-decoration: none;">rafmail.web.id</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ========================================
// Email Notification Functions
// ========================================

/**
 * Send welcome email to new user (pending approval)
 */
export async function sendWelcomeEmail(user: { email: string; name: string }): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Welcome to RafMail - Account Pending Approval",
    html: emailTemplate({
      preheader: "Thank you for joining RafMail! Your account is being reviewed.",
      heroIcon: "👋",
      heroColor: "#f59e0b",
      title: "Welcome to RafMail!",
      subtitle: "Your secure email journey begins here",
      content: `
        <p style="margin: 0 0 16px;">Hi <strong style="color: #18181b;">${user.name}</strong>,</p>
        <p style="margin: 0 0 16px;">Thank you for registering with RafMail! We're excited to have you on board.</p>
        <p style="margin: 0 0 24px;">Your account is currently <strong style="color: #f59e0b;">pending approval</strong>. Our team will review your registration and you'll receive a confirmation email once approved.</p>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right: 12px; vertical-align: top;">
                <span style="font-size: 24px;">⏳</span>
              </td>
              <td>
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Status: Awaiting Approval</p>
                <p style="margin: 4px 0 0; color: #a16207; font-size: 13px;">This usually takes less than 24 hours</p>
              </td>
            </tr>
          </table>
        </div>
      `,
      footerNote: "If you didn't create this account, you can safely ignore this email.",
    }),
  });
}

/**
 * Send approval notification to user
 */
export async function sendApprovalEmail(user: { email: string; name: string }): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "Your RafMail Account is Approved!",
    html: emailTemplate({
      preheader: "Great news! Your RafMail account has been approved. Start using secure email now!",
      heroIcon: "🎉",
      heroColor: "#22c55e",
      title: "You're All Set!",
      subtitle: "Your account has been approved",
      content: `
        <p style="margin: 0 0 16px;">Hi <strong style="color: #18181b;">${user.name}</strong>,</p>
        <p style="margin: 0 0 16px;">Great news! Your RafMail account has been <strong style="color: #22c55e;">approved</strong>!</p>
        <p style="margin: 0 0 24px;">You now have full access to our secure disposable email service. Here's what you can do:</p>
        
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #22c55e; margin-right: 8px;">✓</span>
                <span style="color: #166534; font-size: 14px;">Generate unlimited disposable emails</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #22c55e; margin-right: 8px;">✓</span>
                <span style="color: #166534; font-size: 14px;">Access your emails from any device</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #22c55e; margin-right: 8px;">✓</span>
                <span style="color: #166534; font-size: 14px;">Add your own custom domains</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #22c55e; margin-right: 8px;">✓</span>
                <span style="color: #166534; font-size: 14px;">Secure recovery tokens for your addresses</span>
              </td>
            </tr>
          </table>
        </div>
      `,
      buttonUrl: `${APP_URL}/auth/signin`,
      buttonText: "Sign In Now",
      buttonColor: "#22c55e",
      footerNote: "Need help getting started? Reply to this email and we'll be happy to assist.",
    }),
  });
}

/**
 * Send rejection notification to user
 */
export async function sendRejectionEmail(user: { email: string; name: string }): Promise<boolean> {
  return sendEmail({
    to: user.email,
    subject: "RafMail - Registration Status Update",
    html: emailTemplate({
      preheader: "An update regarding your RafMail registration.",
      heroIcon: "📋",
      heroColor: "#71717a",
      title: "Registration Update",
      subtitle: "We have an update about your account",
      content: `
        <p style="margin: 0 0 16px;">Hi <strong style="color: #18181b;">${user.name}</strong>,</p>
        <p style="margin: 0 0 16px;">Thank you for your interest in RafMail. After reviewing your registration, we regret to inform you that we are unable to approve your account at this time.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 500;">Status: Registration Declined</p>
        </div>
        
        <p style="margin: 0 0 16px;">If you believe this was a mistake or would like to provide additional information, please don't hesitate to reach out to our support team.</p>
      `,
      footerNote: "For questions or concerns, please contact our support team.",
    }),
  });
}

/**
 * Send admin notification for new registration
 */
export async function sendAdminNewUserNotification(user: { email: string; name: string }): Promise<boolean> {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Registration: ${user.email}`,
    html: emailTemplate({
      preheader: `New user ${user.name} (${user.email}) is waiting for approval.`,
      heroIcon: "👤",
      heroColor: "#6366f1",
      title: "New User Registration",
      subtitle: "A user is waiting for your approval",
      content: `
        <p style="margin: 0 0 24px;">A new user has registered on RafMail and is pending your approval.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 24px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Email Address</p>
                <p style="margin: 4px 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${user.email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Display Name</p>
                <p style="margin: 4px 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${user.name}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Registration Time</p>
                <p style="margin: 4px 0 0; color: #0f172a; font-size: 15px; font-weight: 500;">${timestamp}</p>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="margin: 0;">Click the button below to review and approve or reject this registration.</p>
      `,
      buttonUrl: `${APP_URL}/admin`,
      buttonText: "Open Admin Panel",
      buttonColor: "#6366f1",
    }),
  });
}

