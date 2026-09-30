import { AnimatePresence, motion } from "framer-motion";
import { MapPin, X, Calendar, Clock } from "lucide-react";
import { GoogleMap, useLoadScript, Marker, OverlayView } from "@react-google-maps/api";
import type { DeclinedEntryDocLite } from "../../../types/global/declined-entry/declined-entry.type";
import { formatTime } from "../../../utils/global/timeDateFormat";
import { useMemo, useState, useEffect } from "react";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

// Radar animation styles - inject into document head
if (typeof document !== "undefined") {
  const existingStyle = document.head.querySelector('style[data-radar-animation]');
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.setAttribute('data-radar-animation', 'true');
    styleSheet.textContent = `
      @keyframes radarPulse {
        0% {
          transform: translate(-50%, -50%) scale(0.6);
          opacity: 0.8;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.7);
          opacity: 0.4;
        }
        100% {
          transform: translate(-50%, -50%) scale(2.8);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export function DeclinedEntryMapModal({
  isOpen,
  onClose,
  declinedEntry,
}: {
  isOpen: boolean;
  onClose: () => void;
  declinedEntry: DeclinedEntryDocLite | null;
}) {
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  // Load Google Maps script - must be called before any conditional returns
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Helper functions (not hooks, so they can be defined conditionally)
  const formatActionType = (actionType: string): string => {
    return actionType
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTimestamp = (timestamp: Date | string): string => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get user initials from name
  const getUserInitials = (name?: string): string => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || "U";
  };

  // Check if profile picture URL is valid
  const isValidImageUrl = (url?: string): boolean => {
    if (!url || typeof url !== "string" || url.trim() === "") return false;
    return (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:image/") ||
      url.startsWith("/")
    );
  };

  // All hooks must be called unconditionally - use safe defaults
  const profilePicture = declinedEntry?.employeeInfo?.profilePicture;
  const hasValidImage = isValidImageUrl(profilePicture);
  const userInitials = useMemo(
    () => getUserInitials(declinedEntry?.employeeInfo?.name),
    [declinedEntry?.employeeInfo?.name]
  );

  // Create custom marker icon as data URL
  const [customIconUrl, setCustomIconUrl] = useState<string>("");

  useEffect(() => {
    // Only create icon if we have declinedEntry
    if (!declinedEntry) {
      setCustomIconUrl("");
      return;
    }

    const createCustomIcon = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 56;
      canvas.height = 56;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawInitials = () => {
        // Draw outer red border circle
        ctx.beginPath();
        ctx.arc(28, 28, 28, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444"; // red-500
        ctx.fill();

        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 56, 56);
        gradient.addColorStop(0, "#3b82f6"); // blue-500
        gradient.addColorStop(1, "#2563eb"); // blue-600
        ctx.beginPath();
        ctx.arc(28, 28, 24, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw initials text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(userInitials, 28, 28);
        setCustomIconUrl(canvas.toDataURL());
      };

      if (hasValidImage && profilePicture) {
        // Draw outer red border circle first
        ctx.beginPath();
        ctx.arc(28, 28, 28, 0, 2 * Math.PI);
        ctx.fillStyle = "#ef4444"; // red-500
        ctx.fill();

        // Draw white background for image
        ctx.beginPath();
        ctx.arc(28, 28, 24, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Load and draw image
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Redraw the circles in case canvas was cleared
          ctx.beginPath();
          ctx.arc(28, 28, 28, 0, 2 * Math.PI);
          ctx.fillStyle = "#ef4444";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(28, 28, 24, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.fill();

          ctx.save();
          ctx.beginPath();
          ctx.arc(28, 28, 20, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(img, 8, 8, 40, 40);
          ctx.restore();
          setCustomIconUrl(canvas.toDataURL());
        };
        img.onerror = () => {
          // Fallback to initials if image fails
          drawInitials();
        };
        img.src = profilePicture;
      } else {
        // Draw initials
        drawInitials();
      }
    };

    createCustomIcon();
  }, [declinedEntry, hasValidImage, profilePicture, userInitials]);

  // Early return AFTER all hooks
  if (!declinedEntry) return null;

  const center = {
    lat: declinedEntry.coordinates.lat,
    lng: declinedEntry.coordinates.lng,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl rounded-lg bg-white shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white z-10 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <MapPin className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Declined Entry Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    {formatActionType(declinedEntry.actionType)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-neutral-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* User Profile Card */}
              {declinedEntry.employeeInfo && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-4">
                    {hasValidImage ? (
                      <img
                        src={profilePicture}
                        alt={declinedEntry.employeeInfo.name || "User"}
                        className="w-16 h-16 rounded-full border-2 border-blue-200 object-cover flex-shrink-0"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = "flex";
                            }
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                        hasValidImage ? "hidden" : ""
                      }`}
                    >
                      {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {declinedEntry.employeeInfo.name || "Unknown Employee"}
                      </h3>
                      {declinedEntry.employeeInfo.idNumber && (
                        <p className="text-sm text-gray-600">
                          ID: {declinedEntry.employeeInfo.idNumber}
                        </p>
                      )}
                      {declinedEntry.employeeInfo.position && (
                        <p className="text-sm text-gray-500 capitalize">
                          {declinedEntry.employeeInfo.position}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Entry Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Timestamp</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTimestamp(declinedEntry.timestamp)}
                    </p>
                  </div>
                </div>

                {declinedEntry.scheduleInfo?.scheduledStartTime && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Scheduled Time</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatTime(declinedEntry.scheduleInfo.scheduledStartTime)}
                        {declinedEntry.scheduleInfo.scheduledEndTime &&
                          ` - ${formatTime(declinedEntry.scheduleInfo.scheduledEndTime)}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Coordinates */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Coordinates</p>
                <p className="text-sm font-mono text-gray-800">
                  {declinedEntry.coordinates.lat.toFixed(6)},{" "}
                  {declinedEntry.coordinates.lng.toFixed(6)}
                </p>
              </div>

              {/* Google Map */}
              {GOOGLE_MAPS_API_KEY ? (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  {!isLoaded ? (
                    <div className="h-[400px] flex items-center justify-center bg-gray-50">
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={center}
                      zoom={15}
                      options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      {customIconUrl && (
                        <>
                          <Marker
                            position={center}
                            title={`${declinedEntry.employeeInfo?.name || "User"} - ${formatActionType(declinedEntry.actionType)}`}
                            icon={{
                              url: customIconUrl,
                              scaledSize: new google.maps.Size(56, 56),
                              anchor: new google.maps.Point(28, 28),
                            }}
                          />
                          {/* Radar Animation Overlay */}
                          <OverlayView
                            position={center}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            getPixelPositionOffset={(width, height) => ({
                              x: -(width / 1),
                              y: -(height / 1),
                            })}
                          >
                            <div
                              style={{
                                position: "relative",
                                width: "100px",
                                height: "100px",
                                pointerEvents: "none",
                                margin: 0,
                                padding: 0,
                              }}
                            >
                              {/* First radar pulse - strongest */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "0%",
                                  left: "0%",
                                  transform: "translate(-50%, -50%)",
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "50%",
                                  border: "3px solid rgba(239, 68, 68, 0.8)",
                                  animation: "radarPulse 2.5s ease-out infinite",
                                  boxShadow: "0 0 15px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.2)",
                                }}
                              />
                              {/* Second radar pulse - medium */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "0%",
                                  left: "0%",
                                  transform: "translate(-50%, -50%)",
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "50%",
                                  border: "3px solid rgba(239, 68, 68, 0.6)",
                                  animation: "radarPulse 2.5s ease-out infinite 0.8s",
                                  boxShadow: "0 0 12px rgba(239, 68, 68, 0.4), inset 0 0 12px rgba(239, 68, 68, 0.15)",
                                }}
                              />
                              {/* Third radar pulse - weakest */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "0%",
                                  left: "0%",
                                  transform: "translate(-50%, -50%)",
                                  width: "100px",
                                  height: "100px",
                                  borderRadius: "50%",
                                  border: "3px solid rgba(239, 68, 68, 0.4)",
                                  animation: "radarPulse 2.5s ease-out infinite 1.6s",
                                  boxShadow: "0 0 10px rgba(239, 68, 68, 0.3), inset 0 0 10px rgba(239, 68, 68, 0.1)",
                                }}
                              />
                            </div>
                          </OverlayView>
                        </>
                      )}
                    </GoogleMap>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-100 h-[400px] flex items-center justify-center">
                  <p className="text-gray-500">
                    Google Maps API key not configured
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end bg-white rounded-b-lg">
              <button
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

