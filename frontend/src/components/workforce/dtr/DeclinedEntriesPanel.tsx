import { motion } from "framer-motion";
import { AlertTriangle, MapPin } from "lucide-react";
import type { DeclinedEntryDocLite } from "../../../types/global/declined-entry/declined-entry.type";
import { getDtrIcon } from "../../../utils/dtr/dtr.utils";

interface DeclinedEntriesPanelProps {
  declinedEntries: DeclinedEntryDocLite[];
  onEntryClick: (entry: DeclinedEntryDocLite) => void;
}

function formatActionType(actionType: string): string {
  return actionType
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeclinedEntriesPanel({
  declinedEntries,
  onEntryClick,
}: DeclinedEntriesPanelProps) {
  if (declinedEntries.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="flex flex-col gap-4 mt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <h4 className="font-semibold text-gray-900">Declined Entries</h4>
        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
          {declinedEntries.length}
        </span>
      </div>

      <div className="space-y-3">
        {declinedEntries.map((entry, index) => {
          const Icon = getDtrIcon(entry.actionType);
          return (
            <motion.div
              key={entry._id || `declined-${index}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors gap-3 sm:gap-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01, x: 4 }}
              onClick={() => onEntryClick(entry)}
            >
              <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0 w-full sm:w-auto">
                <div className="flex-shrink-0 mt-1 sm:mt-0">
                  <Icon className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 capitalize">
                    {formatActionType(entry.actionType)}
                  </div>
                  <div className="text-sm text-gray-600 flex flex-wrap items-center gap-2 mt-1">
                    <span>{formatTimestamp(entry.timestamp)}</span>
                    <span className="text-gray-400 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {entry.coordinates.lat.toFixed(4)},{" "}
                      {entry.coordinates.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 pl-7 sm:pl-0 sm:ml-4">
                <div className="text-xs px-2 py-1 rounded-lg bg-red-200 text-red-800 font-medium inline-block">
                  Outside Geo-Fence
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

