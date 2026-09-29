import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit, CheckCircle, XCircle, Trash2, Smartphone } from "lucide-react";
import { Portal } from "../../common/Portal";
import { motion, AnimatePresence } from "framer-motion";

interface ActionsDropdownProps {
  row: {
    id: string;
    firstName: string;
    lastName: string;
    uploadedFiles?: Array<{ reqFile?: string }>;
    archived?: boolean;
  };
  onEdit: () => void;
  onToggleStatus: () => void;
  onRemove: () => void;
  onRegisterDevice?: () => void;
  isActive: boolean;
}

export const ActionsDropdownForEmployee: React.FC<ActionsDropdownProps> = ({
  onEdit,
  onToggleStatus,
  onRemove,
  onRegisterDevice,
  isActive
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");

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
      const handleScroll = () => setIsOpen(false);
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, { capture: true, once: true });
      window.addEventListener("resize", handleScroll, { once: true });

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", handleScroll, { capture: true });
        window.removeEventListener("resize", handleScroll);
      };
    }
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const dropdownHeight = 180; // Approximate height for 3 items

      // Calculate horizontal position - try to align right, but stay within viewport
      let left = rect.right - dropdownWidth;
      if (left < 10) left = 10;

      // Check vertical space
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setPlacement("top");
        setCoords({
          top: rect.top + window.scrollY - dropdownHeight - 8,
          left: left,
        });
      } else {
        setPlacement("bottom");
        setCoords({
          top: rect.bottom + window.scrollY + 8,
          left: left,
        });
      }
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setIsOpen(!isOpen);
  };

  const actions = [
    {
      label: "Edit Details",
      icon: Edit,
      onClick: onEdit,
      color: "text-green-600 hover:bg-green-50",
    },
    {
      label: isActive ? "Set Inactive" : "Set Active",
      icon: isActive ? XCircle : CheckCircle,
      onClick: onToggleStatus,
      color: isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50",
    },
    {
      label: "Register Device",
      icon: Smartphone,
      onClick: onRegisterDevice || (() => { }),
      color: "text-blue-600 hover:bg-blue-50",
    },
    {
      label: "Remove Employee",
      icon: Trash2,
      onClick: onRemove,
      color: "text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1",
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
              initial={{
                opacity: 0,
                scale: 0.95,
                y: placement === "bottom" ? -10 : 10
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: placement === "bottom" ? -10 : 10
              }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: "absolute",
                top: coords.top,
                left: coords.left,
                zIndex: 9999,
                transformOrigin: placement === "bottom" ? "top right" : "bottom right"
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
