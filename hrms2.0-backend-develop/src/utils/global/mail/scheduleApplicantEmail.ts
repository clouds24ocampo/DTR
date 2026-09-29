import { sendEmail } from "./mail";
import moment from "moment";

export const sendInterviewSchedule = async (
  applicantId: unknown,
  email: string,
  firstName: string,
  lastName: string,
  type: string,
  location: string,
  date: Date,
  time: string,
  jobTitle: string,
  requirementsToBring: string[]
) => {
  const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
  const companyLogo = process.env.COMPANY_LOGO || "";
  const website = process.env.WEBSITE || "#";
  const greeting = `Dear ${firstName || "Applicant"} ${lastName || ""},`;
  const formattedDate = moment(date).format("dddd, MMMM D, YYYY");

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
          .schedule-card {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
            border-left: 4px solid #3b82f6;
          }
          .schedule-item {
            display: flex;
            margin-bottom: 12px;
            align-items: center;
          }
          .schedule-label {
            width: 140px;
            font-weight: 600;
            color: #64748b;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .schedule-value {
            color: #1e293b;
            font-weight: 500;
          }
          .requirements-list {
            margin: 16px 0;
            padding-left: 20px;
            color: #475569;
          }
          .requirements-list li {
            margin-bottom: 8px;
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
            <h1>Interview Invitation</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              Thank you for your application for the <strong>${jobTitle}</strong> position. We were impressed with your background and would like to invite you for an interview.
            </p>
            
            <div class="schedule-card">
              <div class="schedule-item">
                <div class="schedule-label">Date</div>
                <div class="schedule-value">${formattedDate}</div>
              </div>
              <div class="schedule-item">
                <div class="schedule-label">Time</div>
                <div class="schedule-value">${time}</div>
              </div>
              <div class="schedule-item">
                <div class="schedule-label">Location</div>
                <div class="schedule-value">${location}</div>
              </div>
              <div class="schedule-item">
                <div class="schedule-label">Type</div>
                <div class="schedule-value">${type}</div>
              </div>
            </div>

            <div style="margin-bottom: 32px;">
              <h3 style="font-size: 16px; color: #1e293b; margin-bottom: 8px;">Please bring the following:</h3>
              <ul class="requirements-list">
                ${requirementsToBring.map((item) => `<li>${item}</li>`).join("")}
              </ul>
            </div>

            <p class="message">
              Please confirm your availability for this schedule. If you have any questions or need to reschedule, feel free to contact us.
            </p>
            
            <div style="text-align: center;">
              <a href="${website}" class="button">Track Application</a>
            </div>
            
            <p class="message" style="margin-top: 32px; font-size: 12px; color: #94a3b8;">
              Your Application ID: <strong>${applicantId}</strong> (Required for queueing on the day of interview)
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
    subject: `Interview Invitation - ${jobTitle} at ${companyName}`,
    text: `Dear ${firstName || "Applicant"} ${lastName || ""},\n\nYou are invited for an interview for the ${jobTitle} position.\n\nDate: ${formattedDate}\nTime: ${time}\nLocation: ${location}\nType: ${type}\n\nBest regards,\n${companyName}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
