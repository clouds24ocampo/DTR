import "dotenv/config";
/**
 * Central, env-driven application settings. Every tunable value lives here
 * (with a safe default) so nothing is hardcoded in controllers/middleware.
 * See docs/configuration.md.
 */
const int = (value: string | undefined, fallback: number): number => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const sessionDays = int(process.env.SESSION_DAYS, 15);

export const appConfig = {
  auth: {
    bcryptRounds: int(process.env.BCRYPT_ROUNDS, 12),
    sessionDays,
    sessionCookieMaxAgeMs: sessionDays * DAY_MS,
    deviceTokenDays: int(process.env.DEVICE_TOKEN_DAYS, 365),
    passwordMinLength: int(process.env.PASSWORD_MIN_LENGTH, 8),
    loginRateLimit: {
      max: int(process.env.LOGIN_RATE_MAX, 10),
      windowMs: int(process.env.LOGIN_RATE_WINDOW_MS, 15 * 60 * 1000),
    },
    pinRateLimit: {
      max: int(process.env.PIN_RATE_MAX, 5),
      windowMs: int(process.env.PIN_RATE_WINDOW_MS, 15 * 60 * 1000),
    },
    pinTtlMinutes: int(process.env.PIN_TTL_MINUTES, 15),
  },
  http: {
    bodyLimit: process.env.BODY_LIMIT || "1mb",
    uploadMaxBytes: int(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
    uploadMaxFiles: int(process.env.UPLOAD_MAX_FILES, 5),
  },
  botDetection: {
    windowMs: int(process.env.BOT_RATE_WINDOW_MS, 60 * 1000),
    maxRequests: int(process.env.BOT_RATE_MAX, 10),
    alertEmail: process.env.HR_EMAIL,
  },
  services: {
    resendUrl: process.env.RESEND_API_URL || "https://api.resend.com/emails",
    fileUploaderUrl: process.env.FILE_UPLOADER_URL,
  },
} as const;

/** Multer limits shared by every upload route. */
export const uploadLimits = {
  fileSize: appConfig.http.uploadMaxBytes,
  files: appConfig.http.uploadMaxFiles,
};
