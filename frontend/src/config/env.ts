type AppEnv = "development" | "staging" | "production";

export const APP_ENV: AppEnv =
  (import.meta.env.VITE_APP_ENV as AppEnv) ||
  (import.meta.env.VITE_DISPLAY as AppEnv) ||
  (import.meta.env.MODE === "production" ? "production" : "development");

export const envConfig = (() => {
  switch (APP_ENV) {
    case "staging":
      return {
        apiBaseUrl: import.meta.env.VITE_API_URL || "https://staging-api.example.com",
        enableDebug: true,
      };

    case "production":
      return {
        apiBaseUrl: import.meta.env.VITE_API_URL || "https://api.example.com",
        enableDebug: false,
      };

    case "development":
    default:
      return {
        apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:9001",
        enableDebug: true,
      };
  }
})();

export const isDevOrStaging =
  APP_ENV === "development" || APP_ENV === "staging";

// Kill-switch for the floating env badge (default: shown in dev/staging).
// Set VITE_SHOW_ENV_BANNER=false in .env to hide it.
export const SHOW_ENV_BANNER =
  import.meta.env.VITE_SHOW_ENV_BANNER !== "false";