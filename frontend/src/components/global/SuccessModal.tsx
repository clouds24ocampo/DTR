import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function SuccessModal({
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
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Great Success!</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-center">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
