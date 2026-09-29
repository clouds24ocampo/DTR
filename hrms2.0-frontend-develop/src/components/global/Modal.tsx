import React from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
};

export default function Modal({
  open,
  title,
  onClose,
  maxWidthClass = "max-w-md",
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 min-h-screen">
        <div className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 m-2 sm:m-0">
            {title ? (
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                {title}
              </h3>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
