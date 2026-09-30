import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import React from "react";
import {
  backdropVariants,
  modalVariants,
} from "../../utils/global/motionVariants";

type ModalShellProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export default function ModalShell({
  title,
  children,
  onClose,
}: ModalShellProps) {
  return (
    <AnimatePresence>
      <div className="!mt-0 fixed inset-0 z-[60] flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 overflow-y-auto scrollbar-hide py-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Container (pops in/out) */}
        <motion.div
          key="modal-box"
          className="relative w-full max-w-2xl rounded-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200/80 max-h-[90vh] overflow-y-auto scrollbar-hide my-auto"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200/80 sticky top-0 bg-white z-10">
            <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate pr-2">{title}</h4>
            <button
              className="p-1.5 sm:p-2 rounded-lg text-red-600 hover:bg-red-50 flex-shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
