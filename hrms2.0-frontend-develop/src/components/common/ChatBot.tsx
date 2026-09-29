import {
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
  useEffect,
} from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { motion } from "framer-motion";
import { createMessage } from "../../api/global/chatbot/chatbot.api";

export interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const INITIAL_BOT_MESSAGE: Message = {
  id: "1",
  text: "Hi! I'm here to help. What can I assist you today?",
  sender: "bot",
  timestamp: new Date(),
};

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.sender === "user";

  // Typing indicator bubble
  if (message.sender === "bot" && message.text === "") {
    return (
      <div className="flex justify-start">
        <div className="bg-white text-gray-800 shadow-sm rounded-lg rounded-bl-none p-3 max-w-[75%]">
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  // Regular message bubble
  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, x: isUser ? 50 : -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className={`max-w-[75%] rounded-lg p-3 ${
          isUser
            ? "bg-blue-700 text-white rounded-br-none"
            : "bg-white text-gray-800 shadow-sm rounded-bl-none"
        }`}
      >
        <p className="text-sm">{message.text}</p>
        <p
          className={`text-xs mt-1 ${
            isUser ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_BOT_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom smoothly
  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle message sending
  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, text: "", sender: "bot", timestamp: new Date() },
    ]);

    try {
      const response = await createMessage(trimmed);

      // Replace typing bubble with bot reply
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== typingId)
          .concat({
            id: Date.now().toString(),
            text: response || "Sorry, I didn’t catch that.",
            sender: "bot",
            timestamp: new Date(),
          })
      );
    } catch (err) {
      console.error("Chatbot API error:", err);

      // Replace typing bubble with error message
      setMessages((prev) =>
        prev
          .filter((msg) => !msg.id.startsWith("typing-"))
          .concat({
            id: (Date.now() + 3).toString(),
            text: "⚠️ An error occurred while sending your message.",
            sender: "bot",
            timestamp: new Date(),
          })
      );
    }
  }, [inputValue]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-4">
      {/* Chat Window */}
      {isOpen && (
        <motion.div
          ref={chatRef}
          className="bg-white shadow-2xl w-screen sm:w-96 h-[80vh] sm:h-[500px] flex flex-col fixed bottom-0 left-0 sm:bottom-20 sm:left-auto sm:right-6 md:static transition-all sm:max-w-sm rounded-t-lg sm:rounded-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-950 to-blue-800 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-950" />
              </div>
              <div>
                <h3 className="font-semibold">QuantumBot</h3>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-xs text-blue-100">Online</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-600 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white sm:rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={`bg-gradient-to-r from-blue-950 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-full p-3 sm:p-4 shadow-lg transition-all duration-300 hover:scale-110 flex-shrink-0 z-50 ${isOpen ? 'hidden sm:flex' : 'flex'}`}
        aria-label="Toggle chatbot"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
}
