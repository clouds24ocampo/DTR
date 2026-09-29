/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from "react";
import { Search, Plus, Wifi, WifiOff, MessageCircle } from "lucide-react";
import Avatar from "avatox";
import { MessengerUser } from "../../../types/global/messaging/messaging.types";

// Helper function to check if avatar is a valid image URL
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  // Check if it's a valid URL (http/https) or data URL
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("/")
  );
};

interface ConversationSidebarProps {
  getStatusColor: () => string;
  getStatusText: () => string;
  connectionStatus: string;
  setModalOpen: (open: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  filtered: any[];
  selectConv: (id: string) => void;
  selectedId: string;
  account: any;
  filteredEmployee: any[];
  isValidDate: (d: Date) => boolean;
  users: MessengerUser[];
  startConv: (user: MessengerUser) => void;
  conversations: any[];
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  getStatusColor,
  getStatusText,
  connectionStatus,
  setModalOpen,
  search,
  setSearch,
  filtered,
  selectConv,
  selectedId,
  account,
  filteredEmployee,
  isValidDate,
  users,
  startConv,
  conversations,
}) => {
  // Filter online users (excluding current user)
  const onlineUsers = React.useMemo(() => {
    return users.filter(
      (user) =>
        user.isOnline &&
        user.messengerId !== account?._id &&
        user.email?.toLowerCase() !== account?.email?.toLowerCase()
    );
  }, [users, account?._id, account?.email]);

  // Handle user click - check for existing conversation or start new one
  const handleUserClick = (user: MessengerUser) => {
    // Find existing conversation with this user
    const existingConv = conversations.find(
      (c) =>
        c.participants?.includes(user.messengerId || "") &&
        c.participants?.includes(account?._id || "")
    );

    if (existingConv) {
      selectConv(existingConv._id || "");
    } else {
      startConv(user);
    }
  };

  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fabOpen]);

  const getCompactTimestamp = (c: { timestamp?: string }) => {
    if (!c.timestamp || !isValidDate(new Date(c.timestamp))) return "Now";
    const d = new Date(c.timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return timeStr;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      className="
        flex flex-col
        h-full md:w-[500px] md:relative
        md:max-h-[calc(100vh-4rem)]
        border-t border-l border-b md:shadow-sm
        fixed inset-0 md:inset-auto
        bg-white z-20 md:z-0
        border border-gray-200
        overflow-hidden
      "
    >
      <div className="p-4 border-b border-gray-200">
        {/* Mobile: title then search only. Desktop: title + status + plus, then search */}
        <div className="flex items-center justify-between mb-3 md:mb-4 mt-20 sm:mt-0">
          <h2 className="text-lg font-bold text-gray-700 md:font-semibold">Messages</h2>
          <div className="hidden md:flex items-center space-x-2">
            <div
              className={`flex items-center space-x-1 text-xs ${getStatusColor()}`}
            >
              {connectionStatus === "connected" ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span>{getStatusText()}</span>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="text-gray-600 hover:bg-gray-100 rounded-lg transition-colors group"
              title="Start new conversation"
            >
              <Plus className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-xl md:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {onlineUsers.length > 0 && (
          <div className="hidden md:block mt-4">
            <div className="flex items-center space-x-3 overflow-x-auto scrollbar-hide">
              {onlineUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleUserClick(user)}
                  className="flex flex-col items-center flex-shrink-0 group"
                  title={`${user.name}`}
                >
                  <div className="relative">
                    <div className="w-11 h-11 mt-1 rounded-full flex items-center justify-center ring-2 ring-blue-500 group-hover:ring-blue-200 transition-all overflow-hidden">
                      <Avatar
                        src={isValidImageUrl(user?.avatar) ? user.avatar : undefined}
                        name={
                          typeof user?.name === "string" && user.name.trim()
                            ? user.name
                            : user?.email || "User"
                        }
                        size="lg"
                      />
                    </div>

                    <div className="absolute bottom-0 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-600 mt-1 max-w-[60px] truncate">
                    {user.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No conversations found</p>
            <p className="text-sm text-gray-400 mt-1">
              {search
                ? "Try a different search term"
                : "Start a new conversation"}
            </p>
            {!search && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Conversation
              </button>
            )}
          </div>
        ) : (
          filtered.map((c) => {
            const otherParticipantId = c.participants?.find(
              (id: string) => id !== account?._id
            );
            const otherParticipant =
              users.find((emp) => emp.messengerId === otherParticipantId) ||
              null;

            const otherEmployee =
              filteredEmployee.find((emp) => emp._id === otherParticipantId) ||
              null;

            // calculate timestamp display
            const timestampLabel = (() => {
              if (!isValidDate(new Date(c.timestamp ?? ""))) return "Now";

              const diffMs = Date.now() - new Date(c.timestamp ?? "").getTime();
              const diffMinutes = Math.floor(diffMs / 60000);

              if (diffMs < 60_000) return "Now";
              if (diffMinutes < 60)
                return `${diffMinutes} minute${
                  diffMinutes !== 1 ? "s" : ""
                } ago`;

              const diffHours = Math.floor(diffMinutes / 60);
              if (diffHours < 24)
                return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

              const diffDays = Math.floor(diffHours / 24);
              return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
            })();

            const displayName =
              otherParticipant?.name ||
              [otherEmployee?.firstName, otherEmployee?.lastName]
                .filter(Boolean)
                .join(" ") ||
              "Unknown User";
            const compactTime = getCompactTimestamp(c);
            const hasUnread = (c.unread ?? 0) > 0;

            return (
              <div
                key={c._id}
                onClick={() => selectConv(c._id || "")}
                className={`flex-shrink-0 overflow-hidden border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                  selectedId === c._id
                    ? "bg-blue-50 border-blue-200 border-r-2 border-r-blue-500"
                    : ""
                } px-4 py-3 md:p-4`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden bg-transparent">
                      {(() => {
                        const validAvatarUrl = isValidImageUrl(otherParticipant?.avatar)
                          ? otherParticipant?.avatar
                          : undefined;
                        const isSelected = selectedId === c._id;
                        const avatarClassName = isSelected
                          ? "!bg-gradient-to-br !from-blue-500 !to-blue-600"
                          : "!bg-gradient-to-br !from-gray-500 !to-gray-600";
                        return (
                          <Avatar
                            src={validAvatarUrl}
                            name={displayName}
                            size="lg"
                            className={avatarClassName}
                          />
                        );
                      })()}
                    </div>
                    {c.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 truncate min-w-0 text-[15px] md:font-medium">
                        {displayName}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0 tabular-nums md:hidden">
                        {compactTime}
                      </span>
                      <span className="hidden md:inline text-xs text-gray-500 flex-shrink-0">
                        {timestampLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-gray-600 truncate min-w-0">
                        {account._id === c.senderId
                          ? `You: ${c.lastMessage ?? ""}`
                          : (c.lastMessage ?? "")}
                      </p>
                      {hasUnread && (
                        <div className="md:hidden w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                          <span className="text-white text-xs font-medium">{c.unread}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {hasUnread && (
                    <div className="hidden md:flex w-5 h-5 bg-blue-600 rounded-full items-center justify-center flex-shrink-0 animate-pulse">
                      <span className="text-white text-xs font-medium">{c.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile: FAB with expandable menu for New conversation */}
      <div ref={fabRef} className="md:hidden fixed bottom-5 right-4 z-30 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => {
                setModalOpen(true);
                setFabOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium">New conversation</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((prev: boolean) => !prev)}
          className="w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all active:scale-95"
          title="New conversation"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ConversationSidebar;
