import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Download,
  UserCheck,
  UserX,
  Calendar,
  Clock,
} from "lucide-react";
import { Portal } from "../../common/Portal";
import { motion, AnimatePresence } from "framer-motion";

interface ActionsDropdownProps {
  row: {
    id: string;
    firstName: string;
    lastName: string;
    uploadedFiles?: Array<{ reqFile?: string }>;
  };
  onDownloadResume: () => void;
  onHire: () => void;
  onReject: () => void;
  onScheduleInterview: () => void;
  onMarkPending: () => void;
}

export const ActionsDropdownForApplicant: React.FC<ActionsDropdownProps> = ({
  onDownloadResume,
  onHire,
  onReject,
  onScheduleInterview,
  onMarkPending,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", () => setIsOpen(false), { once: true });
      window.addEventListener("resize", () => setIsOpen(false), { once: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", () => setIsOpen(false));
      window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px

      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;

      setCoords({
        top: rect.bottom + window.scrollY,
        left: left,
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsOpen(!isOpen);
  };

  const actions = [
    {
      label: "Download Resume",
      icon: Download,
      onClick: onDownloadResume,
      color: "text-green-600 hover:bg-green-50",
    },
    {
      label: "Schedule Interview",
      icon: Calendar,
      onClick: onScheduleInterview,
      color: "text-purple-600 hover:bg-purple-50",
    },
    {
      label: "Mark as Pending",
      icon: Clock,
      onClick: onMarkPending,
      color: "text-orange-600 hover:bg-orange-50",
    },
    {
      label: "Hire Candidate",
      icon: UserCheck,
      onClick: onHire,
      color: "text-green-600 hover:bg-green-50",
    },
    {
      label: "Reject Candidate",
      icon: UserX,
      onClick: onReject,
      color: "text-red-600 hover:bg-red-50",
    },
  ];

  const handleActionClick = (action: (typeof actions)[0]) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
      >
        <MoreVertical size={16} className="text-gray-500" />
      </button>

      <Portal>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: coords.top + 8,
                left: coords.left,
                zIndex: 9999,
              }}
              className="w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2"
            >
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(action);
                  }}
                  className={`
                    w-full px-4 py-3 text-left flex items-center gap-3 transition-colors duration-200
                    ${action.color}
                  `}
                >
                  <action.icon size={16} />
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};
