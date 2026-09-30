import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface EmojiGifPickerProps {
  onSelect: (value: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  "Smileys & People": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🤣",
    "😂",
    "🙂",
    "🙃",
    "😉",
    "😊",
    "😇",
    "🥰",
    "😍",
    "🤩",
    "😘",
    "😗",
    "😚",
    "😙",
    "🥲",
    "😋",
    "😛",
    "😜",
    "🤪",
    "😝",
    "🤑",
    "🤗",
    "🤭",
    "🤫",
    "🤔",
    "🤐",
    "🤨",
    "😐",
    "😑",
    "😶",
    "😏",
    "😒",
    "🙄",
    "😬",
    "🤥",
    "😌",
    "😔",
    "😪",
    "🤤",
    "😴",
  ],
  "Animals & Nature": [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🐔",
    "🐧",
    "🐦",
    "🐤",
    "🦆",
    "🦅",
    "🦉",
    "🦇",
    "🐺",
    "🐗",
    "🐴",
    "🦄",
    "🐝",
    "🐛",
    "🦋",
    "🐌",
    "🐞",
    "🐜",
    "🦟",
    "🦗",
    "🌸",
    "💐",
    "🌹",
    "🥀",
    "🌺",
    "🌻",
    "🌼",
    "🌷",
    "🌱",
    "🌲",
    "🌳",
    "🌴",
  ],
  "Food & Drink": [
    "🍏",
    "🍎",
    "🍐",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🍆",
    "🥑",
    "🥦",
    "🥬",
    "🥒",
    "🌶️",
    "🌽",
    "🥕",
    "🧄",
    "🧅",
    "🥔",
    "🍠",
    "🥐",
    "🥯",
    "🍞",
    "🥖",
    "🥨",
    "🧀",
    "🥚",
    "🍳",
    "🧈",
    "🥞",
    "🧇",
    "🥓",
    "🥩",
    "🍗",
    "🍖",
    "🦴",
    "🌭",
    "🍔",
  ],
  Activities: [
    "⚽",
    "🏀",
    "🏈",
    "⚾",
    "🥎",
    "🎾",
    "🏐",
    "🏉",
    "🥏",
    "🎱",
    "🪀",
    "🏓",
    "🏸",
    "🏒",
    "🏑",
    "🥍",
    "🏏",
    "🪃",
    "🥅",
    "⛳",
    "🪁",
    "🏹",
    "🎣",
    "🤿",
    "🥊",
    "🥋",
    "🎽",
    "🛹",
    "🛼",
    "🛷",
    "⛸️",
    "🥌",
    "🎿",
    "⛷️",
    "🏂",
    "🪂",
    "🏋️",
    "🤼",
    "🤸",
    "🤺",
    "⛹️",
    "🤾",
    "🏌️",
    "🏇",
    "🧘",
    "🏄",
    "🏊",
  ],
  "Travel & Places": [
    "🚗",
    "🚕",
    "🚙",
    "🚌",
    "🚎",
    "🏎️",
    "🚓",
    "🚑",
    "🚒",
    "🚐",
    "🛻",
    "🚚",
    "🚛",
    "🚜",
    "🦯",
    "🦽",
    "🦼",
    "🛴",
    "🚲",
    "🛵",
    "🏍️",
    "🛺",
    "🚨",
    "🚔",
    "🚍",
    "🚘",
    "🚖",
    "🚡",
    "🚠",
    "🚟",
    "🚃",
    "🚋",
    "🚞",
    "🚝",
    "🚄",
    "🚅",
    "🚈",
    "🚂",
    "🚆",
    "🚇",
    "🚊",
    "🚉",
    "✈️",
    "🛫",
    "🛬",
    "🛩️",
  ],
  Objects: [
    "⌚",
    "📱",
    "📲",
    "💻",
    "⌨️",
    "🖥️",
    "🖨️",
    "🖱️",
    "🖲️",
    "🕹️",
    "🗜️",
    "💾",
    "💿",
    "📀",
    "📼",
    "📷",
    "📸",
    "📹",
    "🎥",
    "📽️",
    "🎞️",
    "📞",
    "☎️",
    "📟",
    "📠",
    "📺",
    "📻",
    "🎙️",
    "🎚️",
    "🎛️",
    "🧭",
    "⏱️",
    "⏲️",
    "⏰",
    "🕰️",
    "⌛",
    "⏳",
    "📡",
    "🔋",
    "🔌",
    "💡",
    "🔦",
    "🕯️",
    "🪔",
    "🧯",
    "🛢️",
  ],
  Symbols: [
    "❤️",
    "🧡",
    "💛",
    "💚",
    "💙",
    "💜",
    "🖤",
    "🤍",
    "🤎",
    "💔",
    "❣️",
    "💕",
    "💞",
    "💓",
    "💗",
    "💖",
    "💘",
    "💝",
    "💟",
    "☮️",
    "✝️",
    "☪️",
    "🕉️",
    "☸️",
    "✡️",
    "🔯",
    "🕎",
    "☯️",
    "☦️",
    "🛐",
    "⛎",
    "♈",
    "♉",
    "♊",
    "♋",
    "♌",
    "♍",
    "♎",
    "♏",
    "♐",
    "♑",
    "♒",
    "♓",
    "🆔",
    "⚛️",
    "🉑",
  ],
};

const SAMPLE_GIFS = [
  {
    id: "1",
    url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    title: "Happy",
  },
  {
    id: "2",
    url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    title: "Applause",
  },
  {
    id: "3",
    url: "https://media.giphy.com/media/L1R1tvI9svkIWwpVYr/giphy.gif",
    title: "Dancing",
  },
  {
    id: "4",
    url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    thumbUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    title: "Excited",
  },
  {
    id: "5",
    url: "https://media.giphy.com/media/RrVzUOXldFe8M/giphy.gif",
    title: "Thumbs Up",
  },
  {
    id: "6",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    title: "Love",
  },
  {
    id: "7",
    url: "https://media.giphy.com/media/26tknCqiJrBQG6bxC/giphy.gif",
    title: "Laughing",
  },
  {
    id: "8",
    url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",
    title: "Celebration",
  },
  // --- Additional GIFs ---
  {
    id: "9",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    title: "Clapping",
  },
  {
    id: "10",
    url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
    title: "Wow",
  },
  {
    id: "11",
    url: "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
    title: "Mind Blown",
  },
  {
    id: "12",
    url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
    title: "Facepalm",
  },
  {
    id: "13",
    url: "https://media.giphy.com/media/3ohzdOrcdpiD26TPt6/giphy.gif",
    title: "Confused",
  },
  {
    id: "14",
    url: "https://media.giphy.com/media/3orieV1pP9f3qN1rte/giphy.gif",
    title: "Crying",
  },
  {
    id: "15",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    title: "Cheering",
  },
  {
    id: "16",
    url: "https://media.giphy.com/media/3o6ZtpxSZbQRRnwCKQ/giphy.gif",
    title: "No Way",
  },
  {
    id: "17",
    url: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif",
    title: "Excited Jump",
  },
  {
    id: "18",
    url: "https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif",
    title: "Happy Dance",
  },
  {
    id: "19",
    url: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
    title: "Relaxing",
  },
  {
    id: "20",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
    title: "Cheer",
  },
  {
    id: "21",
    url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    title: "Surprised",
  },
  {
    id: "22",
    url: "https://media.giphy.com/media/3o7btYJp4vXy5sjlmQ/giphy.gif",
    title: "Thinking",
  },
  {
    id: "23",
    url: "https://media.giphy.com/media/l0Exk8EUzSLsrErEQ/giphy.gif",
    title: "Thumbs Down",
  },
  {
    id: "24",
    url: "https://media.giphy.com/media/26n6WywJyh39n1pBu/giphy.gif",
    title: "Sleepy",
  },
  {
    id: "25",
    url: "https://media.giphy.com/media/3o7TKxOhpC6y4r6zZm/giphy.gif",
    title: "Motivated",
  },
  {
    id: "26",
    url: "https://media.giphy.com/media/xT0Gqz1Nr4PKVqVxLy/giphy.gif",
    title: "Peace Out",
  },
  {
    id: "27",
    url: "https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif",
    title: "Flex",
  },
  {
    id: "28",
    url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    title: "Hype",
  },
];

const SAMPLE_STICKERS = [
  {
    id: "1",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.gif",
    title: "Wave",
  },
  {
    id: "2",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif",
    title: "Heart",
  },
  {
    id: "3",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif",
    title: "Party",
  },
  {
    id: "4",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif",
    title: "Thumbs Up",
  },
  {
    id: "5",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif",
    title: "Fire",
  },
  {
    id: "6",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif",
    title: "Party Face",
  },
  {
    id: "7",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif",
    title: "Heart Eyes",
  },
  {
    id: "8",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif",
    title: "Clap",
  },
  {
    id: "9",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif",
    title: "Rocket",
  },
  {
    id: "10",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif",
    title: "Sparkles",
  },
  {
    id: "11",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif",
    title: "100",
  },
  {
    id: "12",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f381/512.gif",
    title: "Gift",
  },
  // --- Additional Stickers ---
  {
    id: "13",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/512.gif",
    title: "Smile",
  },
  {
    id: "14",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif",
    title: "Laugh Cry",
  },
  {
    id: "15",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif",
    title: "Cool",
  },
  {
    id: "16",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.gif",
    title: "Ghost",
  },
  {
    id: "17",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47e/512.gif",
    title: "Alien",
  },
  {
    id: "18",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif",
    title: "Pray",
  },
  {
    id: "19",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif",
    title: "Star-Struck",
  },
  {
    id: "20",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f643/512.gif",
    title: "Upside Down",
  },
  {
    id: "21",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.gif",
    title: "Wink",
  },
  {
    id: "22",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.gif",
    title: "Angry",
  },
  {
    id: "23",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif",
    title: "Crying",
  },
  {
    id: "24",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.gif",
    title: "Scream",
  },
  {
    id: "25",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif",
    title: "Surprised",
  },
  {
    id: "26",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f913/512.gif",
    title: "Nerd Face",
  },
  {
    id: "27",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.gif",
    title: "Alien Monster",
  },
  {
    id: "28",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a9/512.gif",
    title: "Poop",
  },
  {
    id: "29",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.gif",
    title: "Unicorn",
  },
  {
    id: "30",
    url: "https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.gif",
    title: "Robot",
  },
];

const EmojiGifPicker: React.FC<EmojiGifPickerProps> = ({
  onSelect,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"emoji" | "gif" | "sticker">(
    "emoji"
  );
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Smileys & People");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 right-0 mb-2 w-full max-w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-200 min-w-0">
        <div className="flex gap-2 min-w-0 flex-shrink">
          <button
            onClick={() => setActiveTab("emoji")}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "emoji"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Emoji
          </button>
          <button
            onClick={() => setActiveTab("sticker")}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "sticker"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Sticker
          </button>
          <button
            onClick={() => setActiveTab("gif")}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "gif"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            GIF
          </button>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {activeTab === "emoji" ? (
        <div className="h-80 flex flex-col min-h-0">
          <div className="flex overflow-x-auto gap-2 px-3 py-2 border-b border-gray-200 scrollbar-thin scrollbar-thumb-gray-300 min-w-0 flex-shrink-0">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-0">
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {EMOJI_CATEGORIES[
                selectedCategory as keyof typeof EMOJI_CATEGORIES
              ].map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "sticker" ? (
        <div className="h-80 overflow-y-auto overflow-x-hidden p-3 min-h-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0">
            {SAMPLE_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => {
                  onSelect(sticker.url);
                  onClose();
                }}
                className="relative group overflow-hidden rounded-lg bg-gray-50 hover:bg-gray-100 transition-all p-2"
              >
                <img
                  src={sticker.url}
                  alt={sticker.title}
                  className="w-full h-24 object-contain group-hover:scale-110 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-80 overflow-y-auto overflow-x-hidden p-3 min-h-0">
          <div className="grid grid-cols-2 gap-2 min-w-0">
            {SAMPLE_GIFS.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelect(gif.url);
                  onClose();
                }}
                className="relative group overflow-hidden rounded-lg border border-gray-200 hover:border-blue-500 transition-all"
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {gif.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiGifPicker;
