import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Info, X } from "lucide-react";
import {
  backdropVariants,
  modalVariants,
} from "../../utils/global/motionVariants";

interface InfoModalProps {
  open: boolean;
  title?: string;
  message: string;
  type?: "info" | "warning" | "error";
  onClose: () => void;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export default function InfoModal({
  open,
  title,
  message,
  type = "info",
  onClose,
  showCancel = false,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
}: InfoModalProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case "warning":
        return "bg-yellow-100";
      case "error":
        return "bg-red-100";
      default:
        return "bg-blue-100";
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700";
      case "error":
        return "bg-red-600 hover:bg-red-700";
      default:
        return "bg-blue-600 hover:bg-blue-700";
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 !mt-0"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`${getIconBg()} rounded-full p-2`}>
                  {getIcon()}
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {title || (type === "warning" ? "Warning" : type === "error" ? "Error" : "Information")}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              {showCancel && (
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors text-sm sm:text-base"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-4 py-2.5 rounded-lg text-white font-medium transition-colors text-sm sm:text-base shadow-sm ${getButtonColor()}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

