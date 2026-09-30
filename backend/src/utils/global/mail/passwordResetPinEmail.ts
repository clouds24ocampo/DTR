import { sendEmail } from "./mail";

export const sendPasswordResetPinEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  pin: string
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
  const greeting = `Dear ${firstName || ""} ${lastName || ""},`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #1e293b;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
            padding: 32px;
            text-align: center;
          }
          .logo {
            height: 64px;
            width: auto;
            margin-bottom: 16px;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 40px;
          }
          .greeting {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            color: #0f172a;
          }
          .message {
            line-height: 1.6;
            margin-bottom: 24px;
            color: #475569;
          }
          .pin-container {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 32px;
            margin: 32px 0;
            text-align: center;
            border: 2px dashed #cbd5e1;
          }
          .pin-code {
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 0.2em;
            color: #2563eb;
            font-family: 'Courier New', monospace;
            margin: 0;
          }
          .warning {
            background-color: #fff7ed;
            border-left: 4px solid #f97316;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          .warning-title {
            font-weight: 700;
            color: #9a3412;
            font-size: 14px;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .warning-text {
            color: #c2410c;
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
          }
          .footer {
            padding: 32px;
            text-align: center;
            font-size: 14px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : ""}
            <h1>Security Verification</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              We received a request to reset the password for your account. Please use the verification code below to complete the process.
            </p>
            
            <div class="pin-container">
              <p style="margin-bottom: 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Your Reset PIN</p>
              <h2 class="pin-code">${pin}</h2>
            </div>

            <div class="warning">
              <div class="warning-title">⚠️ Security Notice</div>
              <p class="warning-text">
                • This code will expire in 15 minutes.<br/>
                • Never share this PIN with anyone, including our support team.<br/>
                • If you did not request this change, please ignore this email.
              </p>
            </div>

            <p class="message">
              Enter this PIN on the verification screen to set a new password.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.<br/>
            This is an automated message, please do not reply.
          </div>
        </div>
      </body>
    </html>
  `;

  const emailOptions = {
    to: email,
    subject: `Password Reset PIN - ${companyName}`,
    text: `Dear ${firstName || ""} ${lastName || ""},\n\nWe received a request to reset your password. Use the PIN below to verify your identity:\n\nPIN: ${pin}\n\nSecurity Notice:\n- This code expires in 15 minutes.\n- Do not share this code.\n- If you didn't request this, ignore this email.\n\nBest regards,\n${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};

