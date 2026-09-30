import { sendEmail } from "./mail";

export const sendPendingEmail = async (
  applicantId: unknown,
  email: string,
  firstName: string,
  lastName: string,
  jobTitle: string
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
  const website = process.env.WEBSITE || "#";
  const greeting = `Dear ${firstName || "Applicant"} ${lastName || ""},`;

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
          .status-card {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            border-left: 4px solid #f59e0b;
          }
          .status-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
          }
          .status-label {
            width: 140px;
            font-weight: 600;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .status-value {
            color: #1e293b;
            font-weight: 500;
          }
          .footer {
            padding: 32px;
            text-align: center;
            font-size: 14px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : ""}
            <h1>Application Status Update</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              Thank you for taking the time to interview with us for the <strong>${jobTitle}</strong> position. We truly appreciate the opportunity to learn more about your skills and experience.
            </p>
            <p class="message">
              We are currently in the final stages of our selection process. We understand that waiting can be difficult, and we appreciate your continued patience while we finalize our decision.
            </p>
            
            <div class="status-card">
              <div class="status-item">
                <div class="status-label">Position</div>
                <div class="status-value">${jobTitle}</div>
              </div>
              <div class="status-item">
                <div class="status-label">Application ID</div>
                <div class="status-value"><code>${applicantId}</code></div>
              </div>
              <div class="status-item">
                <div class="status-label">Current Status</div>
                <div class="status-value"><span style="color: #d97706; font-weight: 700;">Under Final Review</span></div>
              </div>
            </div>

            <p class="message">
              We will notify you of the outcome as soon as a decision is reached. In the meantime, you can continue to track your application on our portal.
            </p>
            
            <div style="text-align: center;">
              <a href="${website}" class="button">Track Application</a>
            </div>
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
    subject: `Application Status Update - ${jobTitle} at ${companyName}`,
    text: `Dear ${firstName || "Applicant"} ${lastName || ""},
    
    Thank you for interviewing for the ${jobTitle} position. Your application is currently under final review.
    
    Application ID: ${applicantId}
    
    We will update you as soon as possible.
    
    Best regards,
    ${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
