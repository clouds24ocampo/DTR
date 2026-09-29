import { sendEmail } from "./mail";

export const sendJobApplicationConfirmation = async (
  applicantId: unknown,
  email: string,
  firstName: string,
  lastName: string,
  job: string
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
          .info-card {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            border-left: 4px solid #3b82f6;
          }
          .info-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
          }
          .info-label {
            width: 140px;
            font-weight: 600;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .info-value {
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
            <h1>Application Received</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              Thank you for your interest in joining <strong>${companyName}</strong>. This email confirms that we have successfully received your application for the <strong>${job}</strong> position.
            </p>
            <p class="message">
              Our recruitment team is currently reviewing your profile. We carefully evaluate every candidate and will be in touch shortly regarding the next steps in our selection process.
            </p>
            
            <div class="info-card">
              <div class="info-item">
                <div class="info-label">Position</div>
                <div class="info-value">${job}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Application ID</div>
                <div class="info-value"><code>${applicantId}</code></div>
              </div>
            </div>

            <p class="message">
              You can track the status of your application at any time by visiting our career portal.
            </p>
            
            <div style="text-align: center;">
              <a href="${website}" class="button">Track Application</a>
            </div>

            <p class="message" style="margin-top: 32px;">
              Thank you again for considering a career with us. We appreciate the time you took to apply.
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
    subject: `Application Received: ${job} at ${companyName}`,
    text: `Dear ${firstName || "Applicant"} ${lastName || ""},
    
    Thank you for applying for the ${job} position. We have received your application and are currently reviewing your qualifications.
    
    Application ID: ${applicantId}
    
    You can track your application status at ${website}.
    
    Best regards,
    ${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
