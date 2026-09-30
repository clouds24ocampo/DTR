import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X } from "lucide-react";

export function GeoFenceModal({
  isOpen,
  onClose,
  userLocation,
  actionLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  actionLabel?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-tight">
                      Outside Perimeter
                    </h2>
                    <p className="text-xs text-slate-500 font-medium tracking-wide border-b border-red-100 w-fit">GEOFENCE RESTRICTION</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-gray-100 transition-colors text-gray-400"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500 leading-relaxed">
                  You are currently outside the authorized area for <span className="font-bold text-slate-900 underline decoration-blue-500 underline-offset-4">{actionLabel || "this action"}</span>. Please ensure you are within the designated work site.
                </p>

                {userLocation && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Current Coordinates
                      </p>
                      <p className="text-sm font-mono font-medium text-gray-700">
                        {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">
                      ACCESS DENIED
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200 text-sm"
              >
                Understood
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
