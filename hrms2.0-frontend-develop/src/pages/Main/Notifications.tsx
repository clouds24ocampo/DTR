import { useNotifications } from "../../hooks/useNotifications";
import NotificationItem from "../../components/global/notification/NotificationItem";
import { Loader2, CheckCheck } from "lucide-react";

const Notifications = () => {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {notifications.length > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <p className="text-gray-500">No notifications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm divide-y divide-gray-100">
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
