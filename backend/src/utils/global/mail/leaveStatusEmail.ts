import { sendEmail } from "./mail";
import moment from "moment";

export const sendLeaveStatusEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  type: string,
  startDate: Date,
  endDate: Date,
  status: "approved" | "rejected",
  reviewerName: string,
  note?: string
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
  const greeting = `Dear ${firstName || "Employee"} ${lastName || ""},`;
  const formattedStart = moment(startDate).format("MMMM D, YYYY");
  const formattedEnd = moment(endDate).format("MMMM D, YYYY");
  const dateRange = formattedStart === formattedEnd ? formattedStart : `${formattedStart} - ${formattedEnd}`;

  const isApproved = status === "approved";
  const statusColor = isApproved ? "#10b981" : "#ef4444";
  const statusText = isApproved ? "APPROVED" : "REJECTED";

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
            border-left: 6px solid ${statusColor};
          }
          .status-header {
            font-weight: 700;
            color: ${statusColor};
            font-size: 18px;
            margin-bottom: 16px;
            text-transform: uppercase;
          }
          .info-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
          }
          .info-label {
            width: 120px;
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
          .note {
            background-color: #fff7ed;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
            font-style: italic;
            color: #9a3412;
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
            <h1>Leave Request Update</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              This email is to inform you that your leave request has been processed.
            </p>
            
            <div class="status-card">
              <div class="status-header">Request ${statusText}</div>
              <div class="info-item">
                <div class="info-label">Leave Type</div>
                <div class="info-value">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Dates</div>
                <div class="info-value">${dateRange}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Reviewer</div>
                <div class="info-value">${reviewerName}</div>
              </div>
              
              ${note ? `
              <div class="note">
                <strong>Note:</strong> ${note}
              </div>
              ` : ''}
            </div>

            <p class="message">
              You can view more details in your employee portal.
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
    subject: `Leave Request ${statusText} - ${dateRange}`,
    text: `Dear ${firstName || "Employee"} ${lastName || ""},
    
    Your leave request for ${type} (${dateRange}) has been ${statusText} by ${reviewerName}.
    
    ${note ? `Note: ${note}` : ""}
    
    Best regards,
    ${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};