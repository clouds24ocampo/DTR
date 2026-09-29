import React from "react";
import { X } from "lucide-react";

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
}) => {
  return (
    <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200">
      <div>
        {subtitle && <p className="text-sm text-gray-600 mb-1">{subtitle}</p>}
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>
  );
};

