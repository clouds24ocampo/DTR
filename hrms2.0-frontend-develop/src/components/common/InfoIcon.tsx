import { Info, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface InfoIconProps {
  description: string;
  title?: string;
  className?: string;
}

export function InfoIcon({ description, title, className = "" }: InfoIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 280;
      const popupHeight = 200;
      const spacing = 8;

      let top = rect.bottom + spacing;
      let left = rect.left + rect.width / 2 - popupWidth / 2;

      // Adjust if popup goes off screen
      if (left < 10) left = 10;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }

      // If popup goes below viewport, show above instead
      if (top + popupHeight > window.innerHeight - 10) {
        top = rect.top - popupHeight - spacing;
      }

      setPosition({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="text-blue-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full p-0.5"
        aria-label="Show information"
      >
        <Info className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && position && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[10000]"
              onClick={() => setIsOpen(false)}
            />
            {/* Popup */}
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[10001] w-[280px] bg-white rounded-lg shadow-xl border border-gray-200 p-4"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                {title && (
                  <h4 className="text-sm font-semibold text-gray-900 pr-4">
                    {title}
                  </h4>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-auto"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                {description}
              </p>
              {/* Arrow pointing to button */}
              <div
                className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"
                style={{
                  top: "-6px",
                  left: "50%",
                  transform: "translateX(-50%) rotate(45deg)",
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

