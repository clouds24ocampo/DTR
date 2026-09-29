export function getFilenameFromHeadersOrUrl(res: Response, urlStr: string): string {
  const cd = res.headers.get("content-disposition") || "";

  const utf8Match = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));

  const quotedMatch = cd.match(/filename\s*=\s*"(.*?)"/i);
  if (quotedMatch) return quotedMatch[1];

  const plainMatch = cd.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch) return plainMatch[1].trim().replace(/["']/g, "");

  try {
    const u = new URL(urlStr, window.location.href);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : "download";
  } catch {
    return "download";
  }
}

export async function downloadUrlAsFile(urlStr: string): Promise<void> {
  const res = await fetch(urlStr, { mode: "cors" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const filename = getFilenameFromHeadersOrUrl(res, urlStr);

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "download";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}
