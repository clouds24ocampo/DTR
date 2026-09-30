export async function registerSW(swUrl = "/service-worker.js") {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.register(swUrl);
  await navigator.serviceWorker.ready;
  return reg;
}

export async function ensurePermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "granted") {
    return await Notification.requestPermission();
  }
  return "granted";
}
