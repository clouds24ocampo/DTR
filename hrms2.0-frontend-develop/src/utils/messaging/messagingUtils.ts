import { AttachedFile } from "../../types/global/messaging/messageio.types";

export const formatTime = (time?: string | number | Date) => {
  if (!time) return "";
  return new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const isValidDate = (d: Date) =>
  d instanceof Date && !isNaN(d.getTime());

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const REACTIONS = [
  { emoji: "👍", name: "like", color: "text-blue-600" },
  { emoji: "❤️", name: "love", color: "text-red-600" },
  { emoji: "😂", name: "haha", color: "text-yellow-600" },
  { emoji: "😮", name: "wow", color: "text-orange-600" },
  { emoji: "😢", name: "sad", color: "text-blue-500" },
  { emoji: "😡", name: "angry", color: "text-red-700" },
];

export const safeDownload = async (url: string, fileName?: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName || url.split("/").pop() || "file";
    link.click();
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

export const getAttachmentType = (attachment: AttachedFile) => {
  const { type, name } = attachment;

  const isImage = type.startsWith("image/");
  const isVideo = type.startsWith("video/");
  const isDocument =
    type.startsWith("application/") || type.startsWith("text/");
  const isOfficeDoc = /\.(docx|pptx|xlsx)$/i.test(name);

  return { isImage, isVideo, isDocument, isOfficeDoc };
};
