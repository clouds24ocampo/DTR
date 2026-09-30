import { sendEmail } from "./mail";

export const sendRejectionEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  jobTitle: string,
  //category: string
) => {
  const htmlContent = `
    <html>
      <head>
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            background-repeat: no-repeat;
            background-size: cover;
            position: relative;
          }

          body::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 1);
            z-index: -1;
          }

          .email-container {
            background-color: #ffffff;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            margin-bottom: -50px;
          }
          .logo {
            width: auto;
            height: 80px;
            text-align: center;
            margin-bottom: -25px;
          }
          p {
            line-height: 1.4;
          }
          .bold {
            font-weight: bold;
          }
          hr {
            margin-bottom: 30px;
          }
          a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 100px;
            font-size: 16px;
            font-weight: 400;
            color: #ffff;
            background-color: #103173;
            text-decoration: none;
            border: none;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: background-color 0.3s ease, box-shadow 0.3s ease,
              transform 0.1s ease;
          }

          button:hover {
            background-color: #103173;
            box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
          }

          button:active {
            background-color: #1d242b;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transform: translateY(1px);
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <img
              class="logo"
              src=${process.env.COMPANY_LOGO}
              alt="Company Logo"
            />
          </div>
          <hr />
          <p class="bold">Dear ${firstName || "Applicant"} ${
    lastName || ""
  },</p>
          <p>I hope you’re doing well.</p>
          <p>
            Thank you very much for your interest in the <strong>${jobTitle}</strong> position at <strong>${
    process.env.COMPANY_NAME
  }</strong>. and for the time you invested in the interview process. After careful consideration, we regret to inform you that we have decided to move forward with another candidate for this role.
          </p>
          <p>
            Please know that this decision was not an easy one, as we were impressed by your qualifications and experience. While we are unable to offer you a position at this time, we will keep your information on file for any future opportunities that may be a better fit for your skills and background.
          </p>
          <p>
           We truly appreciate your interest in joining our team and wish you the best of luck in your future career endeavors. If you have any questions or would like feedback, please feel free to reach out.
          </p>
          <p>
           Thank you again, and we hope to stay in touch.
          </p>
          <p class="bold">Best regards,<br />${process.env.COMPANY_NAME}</p>
          <hr />
        </div>
      </body>
    </html>

  `;

  const emailOptions = {
    to: email,
    subject: `Update on Your Application for ${jobTitle} at ${process.env.COMPANY_NAME}`,
    text: `Dear ${firstName || "Applicant"} ${lastName || ""},

    I hope you’re doing well.

    Thank you very much for your interest in the [Job Title] position at ${jobTitle} position at ${
      process.env.COMPANY_NAME
    } and for the time you invested in the interview process. After careful consideration, we regret to inform you that we have decided to move forward with another candidate for this role.

    Please know that this decision was not an easy one, as we were impressed by your qualifications and experience. While we are unable to offer you a position at this time, we will keep your information on file for any future opportunities that may be a better fit for your skills and background.

    We truly appreciate your interest in joining our team and wish you the best of luck in your future career endeavors. If you have any questions or would like feedback, please feel free to reach out.

    Thank you again, and we hope to stay in touch.

    Best regards,
    ${process.env.COMPANY_NAME}`,
    html: htmlContent,
  };

  await sendEmail(emailOptions);
};
