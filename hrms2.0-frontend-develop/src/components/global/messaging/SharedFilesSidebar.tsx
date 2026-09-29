import React, { useMemo } from "react";
import { Download, File, ImageIcon, X } from "lucide-react";
import {
  AttachedFile,
  MessageIo,
} from "../../../types/global/messaging/messageio.types";
import { downloadUrlAsFile } from "../../../utils/global/download";
import { formatFileSize } from "../../../utils/global/fileSizeFormatter";

interface SharedFilesSidebarProps {
  selectedMsgs: MessageIo[];
  onFileClick: (file: AttachedFile) => void;
  setAttachments: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  isOpen?: boolean;
  onClose?: () => void;
}

const SharedFilesSidebar: React.FC<SharedFilesSidebarProps> = ({
  selectedMsgs,
  onFileClick,
  setAttachments,
  isOpen = true,
  onClose,
}) => {
  // Extract all files from all messages in the conversation
  const allFiles = useMemo(() => {
    return selectedMsgs
      .filter((m) => (m.attachments?.length ?? 0) > 0)
      .flatMap((m) =>
        m.attachments!.map((file, idx) => ({
          ...file,
          messageId: m._id,
          messageIndex: idx,
        }))
      );
  }, [selectedMsgs]);

  const handleFileClick = (file: AttachedFile) => {
    onFileClick(file);
    setAttachments([file]);
  };

  return (
    <div
      className={`absolute md:relative top-0 right-0 flex flex-col h-full bg-white flex-shrink-0 transition-all duration-300 ease-in-out z-30 shadow-lg md:shadow-none overflow-hidden ${
        isOpen
          ? "translate-x-0 opacity-100 w-full md:w-80 border-l border-gray-200"
          : "translate-x-full opacity-0 pointer-events-none w-full md:w-0 md:border-l-0"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Shared Files</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-100 rounded-lg transition-colors p-3"
            aria-label="Close shared files"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-4">
        {allFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <File className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">
              No shared files
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Files shared in this conversation will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {allFiles.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              const isDocument =
                file.type.startsWith("application/") ||
                file.type.startsWith("text/");

              return (
                <div
                  key={`${file._id || index}-${file.url}`}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-gray-50"
                  onClick={() => handleFileClick(file)}
                >
                  {isImage ? (
                    <div className="relative">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-white text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-white/80 text-xs mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ) : isVideo ? (
                    <div className="relative">
                      <video
                        src={file.url}
                        className="w-full h-40 object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-800 ml-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-white text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-white/80 text-xs mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {isDocument ? (
                            <File className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900 font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!file?.url) return;
                          downloadUrlAsFile(String(file.url)).catch(() => {
                            window.open(
                              String(file.url),
                              "_blank",
                              "noopener,noreferrer"
                            );
                          });
                        }}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(SharedFilesSidebar);

