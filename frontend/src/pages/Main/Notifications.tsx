import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "../../components/global/notification/NotificationItem";
import { Bell, CheckCheck } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import SkeletonGrid from "../../components/ui/SkeletonGrid";

const Notifications = () => {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="w-full space-y-6 pb-8">
      <PageHeader
        icon={Bell}
        tint="blue"
        eyebrow="Updates"
        title="Notifications"
        subtitle="Stay up to date with your latest alerts and activity."
        actions={
          notifications.length > 0 ? (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-2 rounded-xl hover:bg-blue-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <SkeletonGrid count={4} columns="grid-cols-1" />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications found"
          message="You're all caught up. New alerts will appear here."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] divide-y divide-slate-100 overflow-hidden">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              n={notification}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
