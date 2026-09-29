/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from "react";
import Avatar from "avatox";
import { useNavigate } from "react-router-dom";

const markReadBtnClass =
  "border border-slate-600 rounded-lg bg-slate-700 px-2 py-1 cursor-pointer text-xs text-slate-300 hover:bg-slate-600 transition";

export const getNotificationRedirect = (n: any) => {
  // Handle navigation based on notification type and link
  if (n.link) {
    return n.link;
  }

  // Handle based on notification type
  switch (n.type) {
    case "leave_request":
    case "leave_approved":
    case "leave_rejected":
      return "/leave";
    case "report_assigned":
    case "report_resolved":
      return "/reports";
    case "dtr_reminder":
    case "schedule_update":
      return "/dtr";
    case "job_application":
      return "/jobs";
    case "document_uploaded":
      return "/documents";
    case "message":
      return "/messages";
    default:
      // Fallback to old logic
      if (n.title === "Task") return "/tasks";
      if (n.title === "Note") return "/notes";
      if (n.title === "Contact") return "/contacts";
      if (n.title === "Document") return "/documents";
      return null;
  }
};

type NotificationItemProps = {
  n: any;
  onMarkRead: (id: string) => void;
};

const NotificationItem = memo(({ n, onMarkRead }: NotificationItemProps) => {
  const navigate = useNavigate();

  const handlePanelClick = () => {
    const redirect = getNotificationRedirect(n);
    if (redirect) {
      if (!n.read) {
        onMarkRead(n._id);
      }
      navigate(redirect);
    } else if (!n.read) {
      // Mark as read even if no redirect
      onMarkRead(n._id);
    }
  };

  return (
    <div
      className={`py-2 px-5 border-b border-slate-600 ${
        !n.read ? "bg-blue-500/10" : ""
      } transition-colors duration-150 cursor-pointer hover:bg-slate-700/50`}
      onClick={handlePanelClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handlePanelClick();
      }}
    >
      <div className="flex gap-2 items-center">
        <Avatar src={undefined} name={n.fromName || "User"} size="md" />
        <div>
          <div className="font-medium text-sm text-white">{n.fromName}</div>
          <div className="font-normal text-xs text-slate-300">{n.title}</div>
        </div>
      </div>
      {n.body && (
        <div className="text-slate-400 mt-0.5 text-left text-xs">{n.body}</div>
      )}
      <div className="mt-2 flex justify-between items-center text-slate-500">
        <div className="text-xs">
          <time dateTime={n.createdAt}>
            {new Date(n.createdAt).toLocaleString()}
          </time>
        </div>
        {!n.read && (
          <button
            className={markReadBtnClass}
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(n._id);
            }}
          >
            Mark read
          </button>
        )}
      </div>
      <hr className="mt-2 border-slate-600" />
    </div>
  );
});

export default NotificationItem;
