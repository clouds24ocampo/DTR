import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import {
  backdropVariants,
  modalVariants,
} from "../../utils/global/motionVariants";

type PromptModalProps = {
  open: boolean;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export default function PromptModal({
  open,
  title,
  message,
  defaultValue = "",
  placeholder = "",
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const [inputValue, setInputValue] = useState<string>(defaultValue);

  useEffect(() => {
    if (open) {
      setInputValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    onConfirm(inputValue);
    setInputValue("");
  };

  const handleCancel = () => {
    onCancel();
    setInputValue("");
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 overflow-y-auto scrollbar-hide py-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            key="modal-box"
            className="relative w-full max-w-md rounded-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200/80 my-auto"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200/80">
              <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                {title}
              </h4>
              <button
                className="p-1.5 sm:p-2 rounded-lg text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={handleCancel}
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-sm sm:text-base text-gray-700">{message}</p>
              <div>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm sm:text-base text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

