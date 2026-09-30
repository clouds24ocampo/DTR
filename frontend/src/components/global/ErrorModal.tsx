import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function ErrorModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm !mt-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                  <AlertTriangle className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Operation Failed</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
