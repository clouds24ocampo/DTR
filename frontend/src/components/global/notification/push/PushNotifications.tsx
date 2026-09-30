/* eslint-disable @typescript-eslint/no-explicit-any */
import { ensurePermission, registerSW } from "../../../../push/push-client-core";
import Logo from "../../../../assets/logo/Logo.png";
import { MessageIo } from "../../../../types/global/messaging/messageio.types";

// New Message
export async function triggerChatNotification(
  content: MessageIo | MessageIo[]
) {
  const permission = await ensurePermission();
  if (permission !== "granted") return;

  const reg = await registerSW();
  if (!reg) return;

  const messages = Array.isArray(content) ? content : [content];
  const firstMessage = messages[0];
  const senderName = firstMessage?.senderName || "Unknown Sender";

  let attachmentPreview: string | undefined;
  let badgeIcon: string = Logo;

  const firstAttachment = firstMessage?.attachments?.[0];
  if (firstAttachment) {
    const type = firstAttachment.type || "";

    if (type.includes("image")) {
      attachmentPreview = firstAttachment.url;
    } else if (type.includes("video")) {
      badgeIcon = "/icons/video-file.png";
    } else if (type.includes("pdf")) {
      badgeIcon = "/icons/pdf-file.png";
    } else if (type.includes("word") || type.includes("doc")) {
      badgeIcon = "/icons/doc-file.png";
    } else {
      badgeIcon = "/icons/file-generic.png";
    }
  }

  const buildNotificationBody = (msg: MessageIo): string => {
    if (msg.attachments && msg.attachments.length > 0) {
      const types = msg.attachments.map((att) => {
        const t = att.type || "";
        if (t.includes("image")) return "an image";
        if (t.includes("video")) return "a video";
        if (t.includes("pdf")) return "a PDF";
        if (t.includes("word") || t.includes("doc")) return "a Word document";
        return "a file";
      });
      return `Sent you ${types.join(", ")}.`;
    }
    return msg.content || "Sent you a message!";
  };

  const body =
    messages.length > 1
      ? `${senderName} sent you ${messages.length} messages.`
      : buildNotificationBody(firstMessage);

  const options: NotificationOptions = {
    body,
    icon: Logo,
    badge: badgeIcon,
    data: { url: "/" },
  } as NotificationOptions;

  if (attachmentPreview) {
    (options as any).image = attachmentPreview;
  }

  reg.showNotification(senderName, options);
}
