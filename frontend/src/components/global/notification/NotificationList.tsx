/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useCallback } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationItem from "./NotificationItem";

type Props = {
  items: any[];
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
};

const btnClass =
  "text-sm text-blue-400 hover:text-cyan-400 font-medium transition-colors duration-200";

const panelClass =
  "absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-600 rounded-lg shadow-xl shadow-blue-500/20 z-50 transform transition-all duration-200 ease-out";

function NotificationList({ items, onMarkRead, onMarkAllRead }: Props) {
  const navigate = useNavigate();

  const handleMarkAllRead = useCallback(() => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      items.filter((n) => !n.read).forEach((n) => onMarkRead(n._id));
    }
  }, [items, onMarkRead, onMarkAllRead]);

  if (!items?.length) {
    return (
      <div className="relative z-1000">
        <div className={panelClass}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-white">
              Notifications
            </h3>
          </div>
          <div className="px-6 py-8 text-center">
            <Bell className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No notifications</p>
          </div>
          <div className="px-6 py-4 border-t border-slate-600">
            <button
              className="w-full text-center text-sm text-blue-400 hover:text-cyan-400 font-medium transition-colors duration-200"
              onClick={() => navigate('/notifications')}
            >
              View all notifications
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-1000">
      <div className={panelClass}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-white">Notifications</h3>
          <button className={btnClass} onClick={handleMarkAllRead}>
            Mark all as read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.map((n) => (
            <NotificationItem key={n._id} n={n} onMarkRead={onMarkRead} />
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-600">
          <button
            className="w-full text-center text-sm text-blue-400 hover:text-cyan-400 font-medium transition-colors duration-200"
            onClick={() => navigate('/notifications')}
          >
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(NotificationList);
