import React from "react";
import { Paperclip, Download } from "lucide-react";
import {
  AttachedFile,
  MessageIo,
} from "../../../types/global/messaging/messageio.types";
import { downloadUrlAsFile } from "../../../utils/global/download";

interface AttachmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMsgs: MessageIo[];
  accountId?: string;
  onFileClick: (file: AttachedFile) => void;
  setAttachments: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
}

const AttachmentDrawer: React.FC<AttachmentDrawerProps> = ({
  isOpen,
  onClose,
  selectedMsgs,
  accountId,
  onFileClick,
  setAttachments,
}) => {
  const filteredMessages = selectedMsgs.filter(
    (m) => m.isOwn === accountId && (m.attachments?.length ?? 0) > 0
  );

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${
        isOpen ? "visible opacity-100" : "invisible opacity-0"
      }`}
      onClick={onClose}
    >
      {/* Drawer container */}
      <div
        className={`absolute top-0 right-0 h-full 
        w-full sm:w-96 bg-white border-l border-gray-200 shadow-lg
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Shared Files</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* File list */}
        <div className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
          <div className="columns-2 gap-3 space-y-3">
            {filteredMessages.flatMap((m, i) =>
              m.attachments!.map((file, idx) => (
                <div
                  key={`${i}-${idx}`}
                  className="break-inside-avoid border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition"
                >
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full rounded-lg cursor-pointer"
                      onClick={() => {
                        onFileClick(file);
                        setAttachments([file]);
                      }}
                    />
                  ) : file.type.startsWith("video/") ? (
                    <video controls src={file.url} className="w-full rounded-lg" />
                  ) : (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <div className="flex items-center min-w-0 space-x-2">
                        <Paperclip className="w-5 h-5 text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 truncate block min-w-0 max-w-full">
                          {file.name}
                        </span>
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
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AttachmentDrawer);
