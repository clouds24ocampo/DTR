import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export function ValidationModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading: externalLoading,
}: {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleConfirm = async () => {
    if (externalLoading !== undefined) {
      onConfirm();
    } else {
      try {
        setInternalLoading(true);
        await onConfirm();
      } finally {
        setInternalLoading(false);
      }
    }
  };

  const isLoading = externalLoading ?? internalLoading;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 !mt-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md rounded-lg sm:rounded-lg bg-white p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                {title || "Please Confirm"}
              </h2>
            </div>
            <p className="text-sm sm:text-base text-neutral-700">{message}</p>
            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm sm:text-base text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm sm:text-base text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
