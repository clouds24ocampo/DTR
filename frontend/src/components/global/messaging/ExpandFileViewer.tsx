import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Share,
  MoreHorizontal,
} from "lucide-react";
import { AttachedFile } from "../../../types/global/messaging/messageio.types";
import { downloadUrlAsFile } from "../../../utils/global/download";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: AttachedFile[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export default function ImageModal({
  isOpen,
  onClose,
  files,
  currentIndex,
  onNavigate,
}: ImageModalProps) {
  const [zoom, setZoom] = useState(1);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate(Math.max(currentIndex - 1, 0));
      if (e.key === "ArrowRight")
        onNavigate(Math.min(currentIndex + 1, files.length - 1));
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, currentIndex, files.length, onClose, onNavigate]);

  const currentFile = files[currentIndex];
  if (!currentFile) return null;

  const isVideo = currentFile.type?.startsWith("video/");
  const isImage = currentFile.type?.startsWith("image/");
  const isDocument =
    currentFile.type?.startsWith("application/") ||
    currentFile.type?.startsWith("text/");

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  const handleShare = async (file: AttachedFile) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: file.name,
          text: `Check out this file: ${file.name}`,
          url: file.url,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(file.url);
        alert("File link copied to clipboard!");
      } catch (error) {
        console.error("Copy failed:", error);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={onClose}
          tabIndex={0}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-white text-sm font-medium">
                  {currentFile.name}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    downloadUrlAsFile(currentFile.url).catch(() =>
                      window.open(
                        currentFile.url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    )
                  }
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleShare(currentFile)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <Share size={18} />
                </button>
                <button className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
                  <MoreHorizontal size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Navigation Arrows */}
          {files.length > 1 && (
            <>
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-full transition-colors z-10"
              >
                <ChevronLeft size={24} />
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-full transition-colors z-10"
              >
                <ChevronRight size={24} />
              </motion.button>
            </>
          )}

          {/* File Preview */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: zoom, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-[90vw] max-h-[80vh] flex items-center justify-center bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage && (
              <img
                src={currentFile.url}
                alt={currentFile.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            )}

            {isVideo && (
              <video
                src={currentFile.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
              />
            )}

            {isDocument && (
              <iframe
                src={currentFile.url}
                className="w-[85vw] h-[75vh] bg-white rounded-lg shadow-2xl"
                title={currentFile.name}
              />
            )}
          </motion.div>

          {/* Zoom Controls for images only */}
          {isImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="text-white bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg transition-colors"
                >
                  -
                </button>
                <button
                  onClick={handleZoomIn}
                  className="text-white bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </motion.div>
          )}

          {/* File Counter */}
          {files.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-20 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm"
            >
              {currentIndex + 1} / {files.length}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
