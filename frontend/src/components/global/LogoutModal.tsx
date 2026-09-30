import { X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({
  isOpen,
  onClose,
  onConfirm,
}: LogoutModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      // Wait for animation to finish before unmounting
      const timeout = setTimeout(() => setVisible(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-200 ${
          isOpen
            ? "scale-100 translate-y-0 opacity-100"
            : "scale-95 translate-y-4 opacity-0"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
            <LogOut className="text-red-600" size={24} />
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Logout Confirmation
          </h2>

          <p className="text-gray-600 mb-6 leading-relaxed">
            Are you sure you want to logout? You’ll need to sign in again to
            access your account.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/30"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
