import { useState, useMemo } from "react";
import { X, Search, User, MessageCircle } from "lucide-react";
import { MessengerUser } from "../../../types/global/messaging/messaging.types";
import useAuthStore from "../../../stores/auth/auth.store";
import Avatar from "avatox";

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

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (user: MessengerUser) => void;
  users: MessengerUser[];
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onStartConversation,
  users,
}: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { account } = useAuthStore();

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.email?.toLowerCase() !== account?.email?.toLowerCase() &&
          (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (Array.isArray(user.position) ? user.position[0] : user.position)?.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [users, searchQuery, account?.email]
  );

  if (!isOpen) return null;

  const handleStartConversation = (user: MessengerUser) => {
    setLoading(true);
    onStartConversation(user);
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[600px] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Start New Conversation
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a colleague to message
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleStartConversation(user)}
                  className="w-full p-4 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
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
                      {user.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {user.name}
                        </h3>
                        <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 truncate">
                            {user.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.position}
                          </p>
                        </div>
                        {loading && (
                          <div className="text-xs text-gray-500 truncate">
                            Loading....
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "user" : "users"} available
          </p>
        </div>
      </div>
    </div>
  );
}
