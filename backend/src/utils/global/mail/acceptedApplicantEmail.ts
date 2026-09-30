import { sendEmail } from "./mail";

export const sendAcceptedEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  jobTitle: string,
  uploadJobOfferLetter: string
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
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
          .offer-card {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            border-left: 4px solid #10b981;
          }
          .offer-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
          }
          .offer-label {
            width: 140px;
            font-weight: 600;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .offer-value {
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
            background-color: #10b981;
            color: #ffffff;
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
            <h1>Career Opportunity</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              Congratulations! We are pleased to inform you that you have been selected for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.
            </p>
            <p class="message">
              Your skills, experience, and enthusiasm stood out during the interview process, and we believe you will be a valuable addition to our organization.
            </p>
            
            <div class="offer-card">
              <div class="offer-item">
                <div class="offer-label">Position</div>
                <div class="offer-value">${jobTitle}</div>
              </div>
              <div class="offer-item">
                <div class="offer-label">Offer Details</div>
                <div class="offer-value">
                  <a href="${uploadJobOfferLetter}" style="color: #10b981; text-decoration: none; font-weight: 600;">View Offer Letter &rarr;</a>
                </div>
              </div>
            </div>

            <p class="message">
              We will send you a formal package along with additional onboarding details shortly. Please confirm your acceptance to proceed with the next steps.
            </p>
            <p class="message">
              Once again, welcome to the team!
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
    subject: `Congratulations! You've Been Selected for ${jobTitle} at ${companyName}`,
    text: `Dear ${firstName || "Applicant"} ${lastName || ""},
    
    I am pleased to inform you that we have selected you for the ${jobTitle} position at ${companyName}.
    
    Offer Details: ${uploadJobOfferLetter}
    
    We look forward to having you on board!
    
    Best regards,
    ${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
