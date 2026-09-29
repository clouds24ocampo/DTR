import { sendEmail } from "./mail";
import moment from "moment";

export const sendScheduleConfirmationEmail = async (options: {
    email: string;
    firstName: string;
    lastName: string;
    workplaceName: string;
    stationName?: string | null;
    date: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    startMealTime?: string[];
    label: string;
}) => {
    const {
        email,
        firstName,
        lastName,
        workplaceName,
        stationName,
        date,
        scheduledStartTime,
        scheduledEndTime,
        startMealTime,
        label,
    } = options;

    const formattedDate = moment(date).format("dddd, MMMM D, YYYY");
    const greeting = `Dear ${firstName} ${lastName},`;
    const companyName = process.env.COMPANY_NAME || "HRMS 2.0";
    const companyLogo = process.env.COMPANY_LOGO || "";

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
            margin-bottom: 32px;
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
            width: 120px;
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
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            background-color: #dbeafe;
            color: #1e40af;
            margin-top: 4px;
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
            color: #ffffff;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 16px;
          }
          .meal-time {
            display: inline-block;
            background-color: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 13px;
            margin-right: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : ""}
            <h1>Schedule Confirmation</h1>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              This is to confirm your station assignment for your upcoming shift. Please see the details below:
            </p>
            
            <div class="schedule-card">
              <div class="schedule-item">
                <div class="schedule-label">Date</div>
                <div class="schedule-value">${formattedDate}</div>
              </div>
              <div class="schedule-item">
                <div class="schedule-label">Workplace</div>
                <div class="schedule-value">${workplaceName}</div>
              </div>
              ${stationName ? `
              <div class="schedule-item">
                <div class="schedule-label">Station</div>
                <div class="schedule-value">${stationName}</div>
              </div>
              ` : `
              <div class="schedule-item">
                <div class="schedule-label">Station</div>
                <div class="schedule-value"><i>To be assigned / Self-assignment</i></div>
              </div>
              `}
              <div class="schedule-item">
                <div class="schedule-label">Shift</div>
                <div class="schedule-value">
                  ${scheduledStartTime} - ${scheduledEndTime}
                  <br/>
                  <span class="badge">${label}</span>
                </div>
              </div>
              ${startMealTime && startMealTime.length > 0 ? `
              <div class="schedule-item">
                <div class="schedule-label">Meals</div>
                <div class="schedule-value">
                  ${startMealTime.map(m => `<span class="meal-time">${m}</span>`).join("")}
                </div>
              </div>
              ` : ""}
            </div>

            <p class="message" style="margin-top: 32px;">
              Please ensure you are at your assigned station on time. If you have any questions or conflicts regarding this schedule, please contact the Workforce department immediately.
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

    await sendEmail({
        to: email,
        subject: `Schedule Confirmation - ${formattedDate}`,
        text: `Dear ${firstName} ${lastName},\n\nThis is to confirm your station assignment for ${formattedDate}.\n\nWorkplace: ${workplaceName}\nStation: ${stationName || "Self-assignment"}\nShift: ${scheduledStartTime} - ${scheduledEndTime} (${label})\n\nPlease check your dashboard for more details.\n\nBest regards,\n${companyName}`,
        html: htmlContent,
    });
};
