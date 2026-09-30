import { sendEmail } from "./mail";

export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  username: string,
  position: string
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
  const website = process.env.WEBSITE || "#";
  const greeting = `Dear ${firstName || "Employee"} ${lastName || ""},`;

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
            border-left: 4px solid #10b981;
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
            <h1>Welcome to the Team!</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              We are thrilled to welcome you to <strong>${companyName}</strong>! Your account has been successfully created.
            </p>
            <p class="message">
              You can now log in to the employee portal to access your schedule, view announcements, and manage your profile.
            </p>
            
            <div class="info-card">
              <div class="info-item">
                <div class="info-label">Username</div>
                <div class="info-value">${username}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Position</div>
                <div class="info-value">${position}</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${website}" class="button">Log In to Portal</a>
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
    subject: `Welcome to ${companyName} - Your Account is Ready`,
    text: `Dear ${firstName || "Employee"} ${lastName || ""},
    
    Welcome to ${companyName}! Your account has been created.
    
    Username: ${username}
    Position: ${position}
    
    You can log in at: ${website}
    
    Best regards,
    ${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
