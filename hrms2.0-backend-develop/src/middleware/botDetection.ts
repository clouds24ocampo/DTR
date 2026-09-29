import { Request, Response, NextFunction } from "express";
import { sendEmail } from "../utils/global/mail/mail";

// Simple in-memory rate limit store: IP -> { count, startTime }
const rateLimitMap = new Map<string, { count: number; startTime: number }>();

// Config
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP for sensitive endpoints
const HR_EMAIL = process.env.HR_EMAIL || process.env.MAIL || "crypticx000@gmail.com";

const sendSecurityAlert = async (type: string, ip: string, userAgent: string, body: any) => {
    try {
        const coords = body.coordinates || (body.lat && body.lng ? { lat: body.lat, lng: body.lng } : "Not provided");
        const timestamp = new Date().toLocaleString();

        await sendEmail({
            to: HR_EMAIL,
            subject: `[SECURITY ALERT] Bot Detected: ${type}`,
            text: `A suspicious attempt was blocked.
      
      Type: ${type}
      IP Address: ${ip}
      User-Agent: ${userAgent}
      Timestamp: ${timestamp}
      Coordinates: ${JSON.stringify(coords)}
      
      Payload: ${JSON.stringify(body, null, 2)}
      `,
            html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #d9534f;">Security Alert: Bot Detected</h2>
          <p><strong>Type:</strong> <span style="color: #d9534f;">${type}</span></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
            <p><strong>IP Address:</strong> ${ip}</p>
            <p><strong>User-Agent:</strong> ${userAgent}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <p><strong>Coordinates:</strong> ${JSON.stringify(coords)}</p>
          </div>
          <h3>Payload Dump:</h3>
          <pre style="background: #eee; padding: 10px; overflow-x: auto;">${JSON.stringify(body, null, 2)}</pre>
        </div>
      `
        });
    } catch (error) {
        console.error("Failed to send security alert email:", error);
    }
};

export const botDetectionMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || "unknown";
        const userAgent = req.headers["user-agent"] || "";

        // 1. Check User Agent (Basic)
        if (!userAgent || /curl|wget|python|bot|crawler|spider/i.test(userAgent)) {
            console.warn(`[Bot Block] Suspicious User-Agent: ${userAgent} from ${clientIp}`);
            sendSecurityAlert("Suspicious User-Agent", clientIp as string, userAgent, req.body).catch(console.error);
            return res.status(403).json({ message: "Access denied." });
        }

        // 2. Honeypot Check (Field name: 'website_url' - common trap)
        // The frontend must send this field as empty. If filled, it's a bot.
        // We expect this in req.body for POST requests.
        if (req.method === "POST") {
            const { website_url, _hp_check } = req.body;

            // 'website_url' is the trap field
            if (website_url) {
                console.warn(`[Bot Block] Honeypot triggered by ${clientIp}`);
                sendSecurityAlert("Honeypot Triggered", clientIp as string, userAgent, req.body).catch(console.error);
                return res.status(403).json({ message: "Access denied." });
            }

            // '_hp_check' is a required field proving it's from our modified frontend
            // We enforce this ONLY if 'userId' is provided (Public Mode). 
            // If 'userId' is missing, it's likely an authenticated request (cookie-based) which might come from other internal sources.
            // A bot trying to clock in for someone MUST provide userId.
            if (req.body.userId && !_hp_check) {
                console.warn(`[Bot Block] Missing security token (_hp_check) from ${clientIp}`);
                // We don't email on missing token alone due to potential for spam/noise from misconfigured clients
                return res.status(403).json({ message: "Security check failed. Please validation." });
            }
        }

        // 3. Rate Limiting
        const now = Date.now();
        const rateData = rateLimitMap.get(clientIp as string) || { count: 0, startTime: now };

        if (now - rateData.startTime > RATE_LIMIT_WINDOW_MS) {
            // Reset window
            rateLimitMap.set(clientIp as string, { count: 1, startTime: now });
        } else {
            // Increment count
            rateData.count++;
            rateLimitMap.set(clientIp as string, rateData);

            if (rateData.count > MAX_REQUESTS_PER_WINDOW) {
                console.warn(`[Bot Block] Rate limit exceeded for ${clientIp}`);
                // Rate limit can be high volume, so maybe don't email every time?
                return res.status(429).json({ message: "Too many requests. Please try again later." });
            }
        }

        next();
    } catch (error) {
        console.error("Bot detection middleware error:", error);
        // Fail safe: allow request but log error? Or block? Block is safer for security.
        return res.status(500).json({ message: "Security check failed." });
    }
};
