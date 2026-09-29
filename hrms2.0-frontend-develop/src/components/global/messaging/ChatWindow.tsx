/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { RefObject, useEffect, useState, useCallback } from "react";
import {
  Paperclip,
  Mail,
  Smile,
  MoreVertical,
  Send,
  ArrowLeft,
} from "lucide-react";
import {
  AttachedFile,
  MessageIo,
} from "../../../types/global/messaging/messageio.types";
import { Employee } from "../../../types/hr/employee/employeeDataTypes";
import EmojiGifPicker from "./EmojiGifPicker";
import { MessengerUser } from "../../../types/global/messaging/messaging.types";
import Avatar from "avatox";
import SharedFilesSidebar from "./SharedFilesSidebar";
import { markMessageAsSeen } from "../../../api/global/messaging/messaging.api";

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

interface ChatWindowProps {
  selectedId: string;
  selectedConv: any;
  account: any;
  filteredEmployee: Employee[];
  selectedMsgs: MessageIo[];
  isDragging: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  formatTime: (iso: string | number | Date) => string;
  isValidDate: (d: Date) => boolean;
  REACTIONS: any[];
  showReactions: string | null;
  setShowReactions: React.Dispatch<React.SetStateAction<string | null>>;
  reactionRef: RefObject<HTMLDivElement>;
  handleReaction: (messageId: string, emoji: string) => void;
  handleFileClick: (attachment: AttachedFile) => void;
  setAttachments: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  endRef: RefObject<HTMLDivElement>;
  attachedFiles: File[];
  renderFilePreview: (file: File, index: number) => JSX.Element;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newMsg: string;
  setNewMsg: React.Dispatch<React.SetStateAction<string>>;
  send: () => void;
  connectionStatus: string;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  Attachment: React.MemoExoticComponent<
    ({ attachment }: { attachment: AttachedFile }) => JSX.Element
  >;
  onBack?: () => void;
  users: MessengerUser[];
  typingUsers: { [conversationId: string]: { userId: string; userName: string }[] };
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  isComposeMode?: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  selectedId,
  selectedConv,
  account,
  filteredEmployee,
  selectedMsgs,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  formatTime,
  isValidDate,
  REACTIONS,
  showReactions,
  setShowReactions,
  reactionRef,
  handleReaction,
  handleFileClick,
  setAttachments,
  endRef,
  attachedFiles,
  renderFilePreview,
  fileInputRef,
  handleFileSelect,
  newMsg,
  setNewMsg,
  send,
  connectionStatus,
  setModalOpen,
  Attachment,
  onBack,
  users,
  typingUsers,
  startTyping,
  stopTyping,
  isComposeMode = false,
}) => {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isSharedFilesOpen, setIsSharedFilesOpen] = useState(false);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Track message animation state
  const [lastMsgCount, setLastMsgCount] = useState(selectedMsgs.length);
  const [animatedMsgIds, setAnimatedMsgIds] = useState<Set<string>>(new Set());

  // Track which messages have been clicked to show timestamp
  const [showTimeForMsgIds, setShowTimeForMsgIds] = useState<Set<string>>(new Set());
  const prevSelectedIdRef = React.useRef<string>("");
  const hasMarkedSeenRef = React.useRef<boolean>(false);

  // Device detection for mobile/tablet
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const tapTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = React.useRef<{ msgId: string; time: number } | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobileOrTablet(width < 1024); // Tablet and below (mobile + tablet)
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Mark latest message as seen when chat window is opened or when new message arrives
  useEffect(() => {
    if (!selectedId || !account?._id || selectedMsgs.length === 0) return;

    // When chat window is opened (selectedId changes), reset the flag
    if (selectedId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedId;
      hasMarkedSeenRef.current = false;
    }

    // Find the latest message from the other person
    const latestMessage = selectedMsgs[selectedMsgs.length - 1];
    if (
      latestMessage &&
      latestMessage.senderId !== account._id &&
      latestMessage._id &&
      !latestMessage.isSeen &&
      !hasMarkedSeenRef.current
    ) {
      hasMarkedSeenRef.current = true;
      // Mark the latest message as seen via API
      markMessageAsSeen(latestMessage._id, selectedId).catch((error) => {
        console.error("Error marking message as seen:", error);
        hasMarkedSeenRef.current = false; // Reset on error so we can retry
      });
    }
  }, [selectedId, account?._id, selectedMsgs]);

  // Detect new messages and mark them animated
  useEffect(() => {
    if (selectedMsgs.length > lastMsgCount) {
      const newMessages = selectedMsgs.slice(lastMsgCount);
      setAnimatedMsgIds((prev) => {
        const updated = new Set(prev);
        newMessages.forEach((m) => {
          const id = m._id || (m as any).clientId || String(m.timestamp);
          if (id) updated.add(id);
        });
        return updated;
      });
    }
    setLastMsgCount(selectedMsgs.length);
  }, [selectedMsgs, lastMsgCount]);

  // Clean animation classes after a short delay
  useEffect(() => {
    if (animatedMsgIds.size > 0) {
      const timeout = setTimeout(() => setAnimatedMsgIds(new Set()), 600);
      return () => clearTimeout(timeout);
    }
  }, [animatedMsgIds]);

  const visibleMessages = selectedMsgs.slice(-visibleCount);

  useEffect(() => {
    if (visibleCount === 20) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMsgs]);

  const handleEmojiGifSelect = (value: string) => {
    if (value.startsWith("http")) {
      setSelectedGif(value);
      setNewMsg(value);
    } else {
      setNewMsg((prev) => prev + value);
    }
  };

  // Handle typing detection
  const handleTyping = useCallback(() => {
    if (!selectedId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing
    startTyping(selectedId);

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedId);
    }, 3000);
  }, [selectedId, startTyping, stopTyping]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedId) {
        stopTyping(selectedId);
      }
    };
  }, [selectedId, stopTyping]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (selectedId && typingUsers[selectedId] && typingUsers[selectedId].length > 0) {
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedId, typingUsers]);

  const handleMessageClick = (msgId: string) => {
    if (isMobileOrTablet) {
      // Mobile/Tablet: Handle single tap (timestamp) and double tap (reactions)
      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (lastTap && lastTap.msgId === msgId && now - lastTap.time < 300) {
        // Double tap detected - show reactions
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
        }
        lastTapRef.current = null;
        setShowReactions(
          showReactions === msgId ? null : msgId
        );
      } else {
        // Single tap - show timestamp
        lastTapRef.current = { msgId, time: now };
        setShowTimeForMsgIds((prev) => {
          const updated = new Set(prev);
          if (updated.has(msgId)) {
            updated.delete(msgId);
          } else {
            updated.add(msgId);
          }
          return updated;
        });

        // Clear the last tap after delay to prevent double tap detection
        tapTimeoutRef.current = setTimeout(() => {
          lastTapRef.current = null;
        }, 300);
      }
    } else {
      // Desktop: Just toggle timestamp on click
      setShowTimeForMsgIds((prev) => {
        const updated = new Set(prev);
        if (updated.has(msgId)) {
          updated.delete(msgId);
        } else {
          updated.add(msgId);
        }
        return updated;
      });
    }
  };

  // Cleanup tap timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const iAmParticipant = !!selectedConv?.participants?.includes(
    account?._id ?? ""
  );

  // Other participant info for header and profile block
  const otherParticipantInfo = React.useMemo(() => {
    if (!selectedConv?.participants || !account?._id) return null;
    const otherId = selectedConv.participants.find(
      (id: string) => id !== account._id
    );
    if (!otherId) return null;
    const fromUsers = users?.find((u: any) => u.messengerId === otherId) ?? null;
    const fromEmployee =
      filteredEmployee?.find((emp) => emp._id === otherId) ?? null;
    const displayName =
      (fromUsers?.name && String(fromUsers.name).trim()) ||
      (fromEmployee
        ? [fromEmployee.firstName, fromEmployee.lastName].filter(Boolean).join(" ")
        : "") ||
      fromUsers?.email ||
      "User";
    const avatarUrl = isValidImageUrl(fromUsers?.avatar) ? fromUsers?.avatar : undefined;
    const email = fromUsers?.email || fromEmployee?.email || "";
    const position = fromUsers?.position
      ? (Array.isArray(fromUsers.position) ? fromUsers.position[0] : fromUsers.position)
      : fromEmployee?.position || "";
    return {
      id: otherId,
      displayName,
      avatarUrl,
      email,
      position,
      isOnline: !!selectedConv?.isOnline,
    };
  }, [
    selectedConv?.participants,
    selectedConv?.isOnline,
    account?._id,
    users,
    filteredEmployee,
  ]);

  return (
    <div
      className="
    flex flex-col
    h-full w-full relative
    border-t border-r border-b border-gray-200
    md:shadow-sm
    fixed inset-0 md:inset-auto
    bg-white z-20 md:z-0
    overflow-hidden
  "
    >
      {(selectedId || isComposeMode) && selectedConv && iAmParticipant ? (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Main chat area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="p-2 px-1 sm:px-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="flex items-center justify-center text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Go back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div className="flex items-center space-x-3">
                    {/* Avatar + online badge */}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden ${selectedConv.isOnline
                            ? "border-blue-400"
                            : "border-gray-300"
                          }`}
                      >
                        {otherParticipantInfo ? (
                          <Avatar
                            src={otherParticipantInfo.avatarUrl}
                            name={otherParticipantInfo.displayName}
                            size="md"
                          />
                        ) : (
                          <Avatar name="User" size="md" />
                        )}
                      </div>

                      {selectedConv.isOnline && (
                        <div className="absolute bottom-0.5 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Name + Status */}
                    <div className="flex flex-col">
                      <p className="font-medium text-gray-900">
                        {otherParticipantInfo?.displayName ?? "Unknown User"}
                      </p>
                      <p
                        className={`text-sm ${selectedConv.isOnline
                            ? "text-green-600"
                            : "text-gray-500"
                          }`}
                      >
                        {selectedConv.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setIsSharedFilesOpen((prev) => !prev)}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`flex-1 overflow-y-auto px-4 py-0 space-y-6 bg-gradient-to-b from-gray-50 to-white ${isDragging
                  ? "bg-blue-50 border-2 border-dashed border-blue-300"
                  : ""
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 z-10">
                  <div className="text-center">
                    <Paperclip className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                    <p className="text-lg font-medium text-blue-800">
                      Drop files here
                    </p>
                  </div>
                </div>
              )}

              {/* User profile card - before messages */}
              {otherParticipantInfo && (
                <div className="flex flex-col items-center pt-6 pb-4 px-4 border-b border-gray-100 bg-white/80 rounded-lg mx-2 mb-4">
                  <div className="relative">
                    <div
                      className={`w-[96px] h-[96px] rounded-full border-4 flex items-center justify-center overflow-hidden flex-shrink-0 ${otherParticipantInfo.isOnline
                          ? "border-blue-400"
                          : "border-gray-300"
                        }`}
                    >
                      <Avatar
                        src={otherParticipantInfo.avatarUrl}
                        name={otherParticipantInfo.displayName}
                        className="!h-20 !w-20 !bg-gradient-to-br !from-blue-500 !to-blue-600"
                      />
                    </div>
                    {otherParticipantInfo.isOnline && (
                      <div className="absolute bottom-0.5 right-2 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <p className="font-semibold text-gray-900 mt-3 text-lg">
                    {otherParticipantInfo.displayName}
                  </p>
                  {otherParticipantInfo.position && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {otherParticipantInfo.position}
                    </p>
                  )}
                  {otherParticipantInfo.email && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate max-w-full px-2">
                      {otherParticipantInfo.email}
                    </p>
                  )}
                </div>
              )}

              {/* Empty State */}
              {selectedMsgs.length === 0 ? (
                <div className="flex items-center justify-center h-full py-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-lg font-medium text-gray-800 mb-2">
                      Start the conversation
                    </p>
                    <p className="text-gray-600">
                      Send a message to{" "}
                      {otherParticipantInfo?.displayName ?? "Unknown User"}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {selectedMsgs.length > visibleMessages.length && (
                    <div className="flex justify-center pt-4 pb-2">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 20)}
                        className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-all"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  {(() => {
                    // Find the latest message sent by the current user
                    const myMessages = selectedMsgs.filter(
                      (msg) => msg.senderId === account?._id
                    );
                    const latestMyMessage = myMessages.length > 0
                      ? myMessages[myMessages.length - 1]
                      : null;
                    const latestMyMessageId = latestMyMessage?._id;

                    return visibleMessages.map((m, i) => {
                      const enhancedMessage = m as MessageIo;
                      const isOwn = enhancedMessage.isOwn === account?.email;
                      const prev = visibleMessages[i - 1];
                      const currentTime = new Date(enhancedMessage.timestamp);
                      const prevTime = prev ? new Date(prev.timestamp) : null;
                      const showDivider =
                        !prevTime ||
                        (currentTime.getTime() - prevTime.getTime()) / 1000 / 60 >
                        5;
                      const showDate =
                        (Date.now() -
                          new Date(enhancedMessage.timestamp).getTime()) /
                        (1000 * 60 * 60) >
                        24;

                      const msgId =
                        enhancedMessage._id ||
                        (enhancedMessage as any).clientId ||
                        String(enhancedMessage.timestamp);

                      const isFirstMessage = i === 0;
                      const isLastMessage = i === visibleMessages.length - 1;
                      const isLatestMyMessage = isOwn && enhancedMessage._id === latestMyMessageId;
                      const showTimestamp = showTimeForMsgIds.has(msgId);

                      return (
                        <React.Fragment key={msgId}>
                          {showDivider && (
                            <div className="flex justify-center my-4">
                              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full shadow-sm">
                                {formatTime(currentTime)}
                                {showDate && (
                                  <> {currentTime.toLocaleDateString("en-CA")}</>
                                )}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex ${isOwn ? "justify-end" : "justify-start"
                              } group ${isFirstMessage ? "pt-4" : ""} ${isLastMessage ? "pb-4" : ""}`}
                          >
                            <div
                              className={`relative max-w-xs lg:max-w-md ${animatedMsgIds.has(msgId)
                                  ? "animate-bubble-in [will-change:transform,opacity]"
                                  : ""
                                }`}
                            >
                              {/* Reactions button - Only show on desktop (hover) */}
                              {!isMobileOrTablet && (
                                <button
                                  onClick={() =>
                                    setShowReactions(
                                      showReactions === enhancedMessage._id
                                        ? null
                                        : enhancedMessage._id || ""
                                    )
                                  }
                                  className={`absolute ${isOwn ? "-left-8" : "-right-8"
                                    } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md`}
                                >
                                  <Smile className="w-3 h-3 text-gray-600" />
                                </button>
                              )}

                              {showReactions === enhancedMessage._id && (
                                <div
                                  ref={reactionRef}
                                  className={`absolute flex items-center bg-white border border-gray-200 rounded-full shadow-lg p-2 z-20 ${isOwn
                                      ? "right-0 flex-row-reverse space-x-reverse"
                                      : "left-0 space-x-1"
                                    } ${isMobileOrTablet ? "mb-2" : ""}`}
                                  style={{ top: isMobileOrTablet ? "-4rem" : "-3rem" }}
                                >
                                  {REACTIONS.map((reaction) => (
                                    <button
                                      key={reaction.name}
                                      onClick={() => {
                                        handleReaction(
                                          enhancedMessage._id || "",
                                          reaction.emoji
                                        );
                                        // Close reactions after selection on mobile/tablet
                                        if (isMobileOrTablet) {
                                          setShowReactions(null);
                                        }
                                      }}
                                      className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors text-lg touch-manipulation"
                                      title={reaction.name}
                                    >
                                      {reaction.emoji}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Message Bubble */}
                              {(() => {
                                const hasText = !!(
                                  enhancedMessage.content &&
                                  enhancedMessage.content.trim()
                                );
                                const hasAttachments =
                                  enhancedMessage.attachments &&
                                  enhancedMessage.attachments.length > 0;
                                const imageOnly =
                                  !hasText &&
                                  hasAttachments &&
                                  enhancedMessage.attachments!.every((a) =>
                                    a.type?.startsWith("image/")
                                  );
                                const bubblePadding = imageOnly
                                  ? "p-0 overflow-hidden"
                                  : "px-4 py-3";
                                return (
                                  <div
                                    onClick={() => handleMessageClick(msgId)}
                                    className={`${bubblePadding} rounded-lg shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer ${isOwn
                                        ? "bg-blue-600 text-white rounded-br-lg"
                                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-lg"
                                      }`}
                                  >
                                    {enhancedMessage.content &&
                                      (enhancedMessage.content.startsWith("http") &&
                                        enhancedMessage.content.endsWith(".gif") ? (
                                        <img
                                          src={enhancedMessage.content}
                                          alt="GIF"
                                          className="w-40 h-40 rounded-lg object-cover shadow-md"
                                        />
                                      ) : (
                                        <p className="text-sm leading-relaxed">
                                          {enhancedMessage.content}
                                        </p>
                                      ))}

                                    {enhancedMessage.attachments?.map(
                                      (attachment, idx) => (
                                        <div
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileClick(attachment);
                                            setAttachments([attachment]);
                                          }}
                                          className={hasText ? "mt-2" : ""}
                                        >
                                          <Attachment attachment={attachment} />
                                        </div>
                                      )
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Timestamp and Seen indicator */}
                              {(showTimestamp || (isLatestMyMessage && enhancedMessage.isSeen === true)) && (
                                <p
                                  className={`text-xs mt-1 ${isOwn ? "text-right text-gray-500" : "text-left text-gray-500"
                                    }`}
                                >
                                  {showTimestamp ? (
                                    <>
                                      {isValidDate(currentTime)
                                        ? formatTime(enhancedMessage.timestamp)
                                        : "Now"}
                                      {isLatestMyMessage && enhancedMessage.isSeen === true && " • seen"}
                                    </>
                                  ) : (
                                    isLatestMyMessage && enhancedMessage.isSeen === true && "seen"
                                  )}
                                </p>
                              )}

                              {/* Reactions list */}
                              {Array.isArray(enhancedMessage.reactions) &&
                                enhancedMessage.reactions.length > 0 && (
                                  <div
                                    className={`flex flex-wrap gap-1 -mt-2 ${isOwn ? "justify-start" : "justify-end"
                                      }`}
                                  >
                                    {(() => {
                                      const latestReaction =
                                        enhancedMessage.reactions[
                                        enhancedMessage.reactions.length - 1
                                        ];
                                      return (
                                        <div
                                          key={latestReaction.emoji}
                                          className={`flex items-center space-x-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs cursor-pointer hover:bg-gray-200 transition-colors ${latestReaction.users.includes(
                                            account?._id || ""
                                          )
                                              ? "bg-blue-100 border-blue-300"
                                              : ""
                                            }`}
                                          onClick={() =>
                                            handleReaction(
                                              enhancedMessage._id || "",
                                              latestReaction.emoji
                                            )
                                          }
                                        >
                                          <span>{latestReaction.emoji}</span>
                                          <span className="text-gray-600">
                                            {latestReaction.count}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </>
              )}

              {/* Typing Indicator */}
              {selectedId && typingUsers[selectedId] && typingUsers[selectedId].length > 0 && (
                <div className="flex justify-start pb-4 pt-2">
                  <div className="bg-white text-gray-800 shadow-sm rounded-lg rounded-bl-none px-4 py-2 max-w-xs border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">
                        {typingUsers[selectedId].map((u) => u.userName).join(", ")} {typingUsers[selectedId].length === 1 ? "is" : "are"} typing...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} className="pb-0" />
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white border-t border-gray-200">
              {attachedFiles.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Attached Files:
                  </p>
                  <div className="space-y-2">
                    {attachedFiles.map((file, index) =>
                      renderFilePreview(file, index)
                    )}
                  </div>
                </div>
              )}

              {selectedGif && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 font-medium">
                    Selected GIF:
                  </p>
                  <div className="relative inline-block">
                    <img
                      src={selectedGif}
                      alt="Selected GIF"
                      className="w-32 h-32 rounded-lg object-cover shadow-md"
                    />
                    <button
                      onClick={() => setSelectedGif(null)}
                      className="absolute top-1 right-1 bg-white bg-opacity-80 hover:bg-opacity-100 p-1 rounded-full text-gray-600"
                      title="Remove GIF"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 sm:gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors p-3"
                  title="Attach files"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative flex items-center space-x-2 min-w-0">
                  <input
                    type="text"
                    value={selectedGif ? "" : newMsg}
                    onChange={(e) => {
                      setNewMsg(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type your message..."
                    disabled={connectionStatus !== "connected" || !!selectedGif}
                    className="flex-1 px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (selectedId) {
                          stopTyping(selectedId);
                        }
                        send();
                      }
                    }}
                  />

                  <div className="absolute right-10 sm:right-14 top-1/2 -translate-y-1/2 pr-0 sm:pr-2">
                    <button
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Add emoji or GIF"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  <EmojiGifPicker
                    isOpen={isEmojiPickerOpen}
                    onClose={() => setIsEmojiPickerOpen(false)}
                    onSelect={handleEmojiGifSelect}
                  />
                  <button
                    onClick={() => {
                      if (selectedId) {
                        stopTyping(selectedId);
                      }
                      send();
                      setSelectedGif(null);
                    }}
                    disabled={
                      (!newMsg.trim() &&
                        attachedFiles.length === 0 &&
                        !selectedGif) ||
                      connectionStatus !== "connected"
                    }
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Shared Files Sidebar */}
          <SharedFilesSidebar
            selectedMsgs={selectedMsgs}
            onFileClick={handleFileClick}
            setAttachments={setAttachments}
            isOpen={isSharedFilesOpen}
            onClose={() => setIsSharedFilesOpen(false)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <p className="text-xl font-medium text-gray-800 mb-2">
              Welcome to Messages
            </p>
            <p className="text-gray-600 mb-4">
              Select a conversation to start messaging
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Conversation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
