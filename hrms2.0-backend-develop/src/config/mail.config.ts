import nodemailer from "nodemailer";

// Create a transport configuration for sending emails using nodemailer
const port = Number(process.env.MAIL_PORT) || 587;
const isSecure = process.env.MAIL_SECURE !== undefined 
  ? process.env.MAIL_SECURE === "true" 
  : port === 465;

const mailConfiguration = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: port,
  secure: isSecure,
  auth: process.env.MAIL && process.env.MAIL_PASSWORD ? {
    user: process.env.MAIL,
    pass: process.env.MAIL_PASSWORD,
  } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify the SMTP configuration if host is configured
if (process.env.MAIL_HOST && process.env.MAIL) {
  mailConfiguration.verify((error: any) => {
    if (error) {
      console.warn("SMTP verification warning (emails may fail if credentials invalid):", error.message || error);
    } else {
      console.log("SMTP configuration is valid. Ready to send messages.");
    }
  });
} else {
  console.log("SMTP not fully configured; email sending is disabled.");
}


// Export the mail configuration to be used elsewhere in the application
export default mailConfiguration;
