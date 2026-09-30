/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Download, File, ImageIcon, X } from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocketMessaging";
import NewConversationModal from "../../components/global/messaging/NewConversationModal";
import { MessengerUser } from "../../types/global/messaging/messaging.types";
import { Toaster } from "react-hot-toast";
import useAuthStore from "../../stores/auth/auth.store";
import { useFetchData } from "../../hooks/useFetchData";
import useMessagingStore from "../../stores/global/messaging/messaging.store";
import {
  AttachedFile,
  MessageIo,
} from "../../types/global/messaging/messageio.types";
import { downloadUrlAsFile } from "../../utils/global/download";
import AttachmentDrawer from "../../components/global/messaging/AttachmentDrawer";
import ImageModal from "../../components/global/messaging/ExpandFileViewer";
import ChatWindow from "../../components/global/messaging/ChatWindow";
import ConversationSidebar from "../../components/global/messaging/ConversationSidebar";
import { formatFileSize } from "../../utils/global/fileSizeFormatter";
import {
  formatTime,
  isValidDate,
  REACTIONS,
} from "../../utils/messaging/messagingUtils";
import { motion } from "framer-motion";

export default function MessagingSystem() {
  const endRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reactionRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [selectedComposeUser, setSelectedComposeUser] =
    useState<MessengerUser | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { account } = useAuthStore();
  const {
    messages,
    conversations,
    users,
    connectionStatus,
    addReaction,
    attachedFile,
    removeReaction,
    sendMessage,
    markAsRead,
    createConversation,
    loading,
    registerAccount,
    typingUsers,
    startTyping,
    stopTyping,
  } = useWebSocket();
  const { filteredEmployee } = useFetchData();
  const { setSelectedConvo } = useMessagingStore();

  // === MEMOIZED DATA ===
  const filtered = useMemo(() => {
    const list = conversations.filter(
      (c) =>
        c.participants?.includes(account?._id ?? "") &&
        (c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage ?? "").toLowerCase().includes(search.toLowerCase()))
    );
    return list.sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );
  }, [conversations, search, account?._id]);

  const selectedConv = useMemo(() => {
    if (selectedComposeUser) {
      return {
        _id: "",
        name: selectedComposeUser.name ?? "",
        avatar: selectedComposeUser.avatar ?? "",
        participants: [account?._id, selectedComposeUser.messengerId].filter(
          Boolean
        ) as string[],
        lastMessage: undefined,
        timestamp: undefined,
        unread: 0,
        isOnline: selectedComposeUser.isOnline,
      };
    }
    return conversations.find((c) => c._id === selectedId);
  }, [conversations, selectedId, selectedComposeUser, account?._id]);

  const selectedMsgs = useMemo(
    () =>
      selectedComposeUser ? [] : selectedId ? messages[selectedId] || [] : [],
    [selectedId, selectedComposeUser, messages]
  );

  const isAtBottom = useCallback(() => {
    const c = containerRef.current;
    return !c || c.scrollHeight - c.scrollTop - c.clientHeight < 60;
  }, []);

  useEffect(() => {
    if (selectedId) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId]);

  useEffect(() => {
    if (
      conversations?.length > 0 &&
      !selectedId &&
      !selectedComposeUser
    ) {
      setSelectedId(conversations[0]._id ?? "");
    }
  }, [conversations, selectedId, selectedComposeUser]);

  useEffect(() => {
    if (selectedId && isAtBottom())
      endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMsgs, selectedId, isAtBottom]);

  useEffect(() => {
    if (selectedId) {
      setSelectedConvo(selectedId);
      markAsRead(selectedId);
    }
  }, [selectedId, markAsRead, setSelectedConvo]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showReactions &&
        reactionRef.current &&
        !reactionRef.current.contains(e.target as Node)
      ) {
        setShowReactions(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactions]);

  useEffect(() => {
    if (!account?.email) return;
    const normalizedEmail = account.email.toLowerCase();
    const match = users.some((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) setIsRegistered(true);
  }, [users, account?.email]);

  const send = useCallback(() => {
    if (selectedComposeUser) {
      if (!newMsg.trim() && attachedFiles.length === 0) return;
      createConversation(selectedComposeUser).then((convId) => {
        if (!convId) return;
        setSelectedId(convId);
        setSelectedComposeUser(null);
        if (newMsg.trim()) {
          sendMessage(convId, newMsg);
          setNewMsg("");
        }
        if (attachedFiles.length > 0) {
          attachedFile(convId, attachedFiles);
          setAttachedFiles([]);
        }
      });
      return;
    }
    if (newMsg.trim() && selectedId) {
      sendMessage(selectedId, newMsg);
      setNewMsg("");
    }
    if (attachedFiles.length > 0 && selectedId) {
      attachedFile(selectedId, attachedFiles);
      setAttachedFiles([]);
    }
  }, [
    newMsg,
    selectedId,
    selectedComposeUser,
    attachedFiles,
    sendMessage,
    attachedFile,
    createConversation,
  ]);

  const selectConv = useCallback(
    (id: string) => {
      setSelectedComposeUser(null);
      setSelectedId(id);
      markAsRead(id);
      if (isMobile) setMobileView("chat");
    },
    [isMobile, markAsRead]
  );

  const startConv = useCallback(
    (user: MessengerUser) => {
      setSelectedComposeUser(user);
      setSelectedId("");
      if (isMobile) setMobileView("chat");
    },
    [isMobile]
  );

  const getStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-600";
      case "connecting":
        return "text-yellow-600";
      case "disconnected":
        return "text-red-600";
      default:
        return "text-slate-600";
    }
  }, [connectionStatus]);

  const getStatusText = useCallback(() => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      default:
        return "Unknown";
    }
  }, [connectionStatus]);

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const message = selectedMsgs.find(
        (m) => m._id === messageId
      ) as MessageIo;
      if (!message || !account?._id) return;

      const existingReaction = message.reactions?.find(
        (r) => r.emoji === emoji
      );
      const userReacted = existingReaction?.users.includes(account._id);

      userReacted
        ? removeReaction(messageId, emoji, account._id, selectedId)
        : addReaction(messageId, emoji, account._id, selectedId);

      setShowReactions(null);
    },
    [selectedMsgs, account?._id, removeReaction, addReaction, selectedId]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const renderFilePreview = (file: File, index: number) => {
    const isImage = file.type.startsWith("image/");
    return (
      <div
        key={index}
        className="flex items-center space-x-2 bg-slate-100 rounded-xl p-2"
      >
        <div className="flex-shrink-0">
          {isImage ? (
            <ImageIcon className="w-4 h-4 text-slate-500" />
          ) : (
            <File className="w-4 h-4 text-slate-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 truncate">{file.name}</p>
          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        <button
          onClick={() => removeAttachment(index)}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const handleFileClick = (attachment: AttachedFile) => {
    const fileIndex = attachments.findIndex(
      (file: AttachedFile) => file._id === attachment._id
    );
    setCurrentImageIndex(fileIndex);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);
  const handleNavigate = (index: number) => setCurrentImageIndex(index);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setAttachedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeAttachment = (index: number) =>
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));

  const Attachment = React.memo(
    ({ attachment }: { attachment: AttachedFile }) => {
      const isImage = attachment.type.startsWith("image/");
      const isVideo = attachment.type.startsWith("video/");
      const isDocument =
        attachment.type.startsWith("application/") ||
        attachment.type.startsWith("text/");

      const isOfficeDoc = /\.(docx|pptx|xlsx)$/i.test(attachment.name);
      const previewUrl = isOfficeDoc
        ? `https://docs.google.com/gview?url=${encodeURIComponent(
          attachment.url
        )}&embedded=true`
        : attachment.url;

      // Image only: display just the image, no padding (bubble handles spacing when text + image)
      if (isImage) {
        return (
          <div className="overflow-hidden rounded-xl max-w-[240px] sm:max-w-[280px]">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-auto object-cover block rounded-xl"
            />
          </div>
        );
      }

      return (
        <div
          className="mt-2 p-3 bg-slate-50 rounded-xl border cursor-pointer hover:bg-slate-100 transition"
          onClick={() => {
            if (!attachment?.url) return;
            if (!isVideo && !isDocument) {
              window.open(
                String(attachment.url),
                "_blank",
                "noopener,noreferrer"
              );
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0">
              {isVideo ? (
                <video
                  src={attachment.url}
                  className="w-16 h-16 object-cover rounded-xl"
                  controls
                  onClick={(e) => e.stopPropagation()}
                />
              ) : isDocument ? (
                <iframe
                  src={previewUrl}
                  title={attachment.name}
                  className="w-16 h-16 rounded-xl bg-white border"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex-shrink-0 p-2 bg-slate-200 rounded-xl">
                  <File className="w-6 h-6 text-slate-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {attachment.name}
              </p>
              <p className="text-xs text-slate-500">
                {formatFileSize(attachment.size)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!attachment?.url) return;
                downloadUrlAsFile(String(attachment.url)).catch(() => {
                  window.open(
                    String(attachment.url),
                    "_blank",
                    "noopener,noreferrer"
                  );
                });
              }}
              className="flex-shrink-0 p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }
  );
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {isRegistered ? (
        <motion.div
          className="flex-1 flex min-h-0 bg-white overflow-hidden rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Toaster />
          {isMobile ? (
            mobileView === "list" ? (
              <ConversationSidebar
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                connectionStatus={connectionStatus}
                setModalOpen={setModalOpen}
                search={search}
                setSearch={setSearch}
                filtered={filtered}
                selectConv={selectConv}
                selectedId={selectedId}
                account={account}
                filteredEmployee={filteredEmployee}
                isValidDate={isValidDate}
                users={users}
                startConv={startConv}
                conversations={conversations}
              />
            ) : (
              <ChatWindow
                selectedId={selectedId}
                selectedConv={selectedConv}
                account={account}
                filteredEmployee={filteredEmployee}
                selectedMsgs={selectedMsgs}
                isDragging={isDragging}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                formatTime={formatTime}
                isValidDate={isValidDate}
                REACTIONS={REACTIONS}
                showReactions={showReactions}
                setShowReactions={setShowReactions}
                reactionRef={reactionRef}
                handleReaction={handleReaction}
                handleFileClick={handleFileClick}
                setAttachments={setAttachments}
                endRef={endRef}
                attachedFiles={attachedFiles}
                renderFilePreview={renderFilePreview}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                newMsg={newMsg}
                setNewMsg={setNewMsg}
                send={send}
                connectionStatus={connectionStatus}
                setModalOpen={setModalOpen}
                Attachment={Attachment}
                onBack={() => {
                  setSelectedComposeUser(null);
                  setMobileView("list");
                }}
                users={users}
                typingUsers={typingUsers}
                startTyping={startTyping}
                stopTyping={stopTyping}
                isComposeMode={!!selectedComposeUser}
              />
            )
          ) : (
            <>
              <ConversationSidebar
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
                connectionStatus={connectionStatus}
                setModalOpen={setModalOpen}
                search={search}
                setSearch={setSearch}
                filtered={filtered}
                selectConv={selectConv}
                selectedId={selectedId}
                account={account}
                filteredEmployee={filteredEmployee}
                isValidDate={isValidDate}
                users={users}
                startConv={startConv}
                conversations={conversations}
              />
              <ChatWindow
                selectedId={selectedId}
                selectedConv={selectedConv}
                account={account}
                filteredEmployee={filteredEmployee}
                selectedMsgs={selectedMsgs}
                isDragging={isDragging}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                formatTime={formatTime}
                isValidDate={isValidDate}
                REACTIONS={REACTIONS}
                showReactions={showReactions}
                setShowReactions={setShowReactions}
                reactionRef={reactionRef}
                handleReaction={handleReaction}
                handleFileClick={handleFileClick}
                setAttachments={setAttachments}
                endRef={endRef}
                attachedFiles={attachedFiles}
                renderFilePreview={renderFilePreview}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                newMsg={newMsg}
                setNewMsg={setNewMsg}
                send={send}
                connectionStatus={connectionStatus}
                setModalOpen={setModalOpen}
                Attachment={Attachment}
                users={users}
                typingUsers={typingUsers}
                startTyping={startTyping}
                stopTyping={stopTyping}
                isComposeMode={!!selectedComposeUser}
              />
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="flex-1 flex items-center justify-center min-h-0 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="text-center max-w-md mx-auto p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white text-xl font-bold">!</span>
            </div>
            <p className="text-xl font-medium text-slate-900 mb-2">
              You're not registered for Messenger
            </p>
            <p className="text-slate-600 mb-4">
              It looks like{" "}
              <span className="font-semibold">{account?.email} </span>
              hasn't been added to the messaging system yet.
            </p>
            <motion.button
              onClick={registerAccount}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? (
                <>
                  <svg
                    aria-hidden="true"
                    className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                      fill="currentColor"
                    />
                    <path
                      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                      fill="currentFill"
                    />
                  </svg>
                  Loading...
                </>
              ) : (
                "Register now"
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      <AttachmentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedMsgs={selectedMsgs}
        accountId={account?.email}
        onFileClick={handleFileClick}
        setAttachments={setAttachments}
      />

      <ImageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        files={attachments}
        currentIndex={currentImageIndex}
        onNavigate={handleNavigate}
      />

      <NewConversationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onStartConversation={startConv}
        users={users}
      />
    </div>
  );
}
