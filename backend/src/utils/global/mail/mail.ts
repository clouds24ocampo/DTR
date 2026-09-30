import { appConfig } from "src/config/app.config";
import axios from "axios";

/**
 * Sends an email through the Resend HTTP API.
 * Env: RESEND_API_KEY (required), MAIL_FROM (verified sender, e.g. "HRMS <no-reply@yourdomain.com>").
 * Throws if the email cannot be sent.
 */
export const sendEmail = async (emailOptions: {
	to: string;
	subject: string;
	text: string;
	html?: string;
}) => {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

	try {
		const { data } = await axios.post(
			appConfig.services.resendUrl,
			{
				from: process.env.MAIL_FROM || "HRMS <onboarding@resend.dev>", // resend.dev sender only delivers to your own account until a domain is verified
				to: emailOptions.to,
				subject: emailOptions.subject,
				text: emailOptions.text,
				html: emailOptions.html,
			},
			{ headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15000 }
		);
		return data;
	} catch (error: any) {
		console.error("Error sending email:", error?.response?.data ?? error?.message);
		throw new Error("Failed to send email");
	}
};
