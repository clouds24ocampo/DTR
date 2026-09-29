// src/utils/schedule.utils.ts
import { Coffee, Play, Utensils, type LucideIcon } from "lucide-react";

export type BlockType = "work" | "break" | "meal";

/** Tailwind color classes per block type */
export const getTypeColor = (type: BlockType): string => {
  switch (type) {
    case "work":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "break":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "meal":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

/** Icon component per block type (return a component, not JSX) */
export const getTypeIcon = (type: BlockType): LucideIcon | null => {
  switch (type) {
    case "work":
      return Play;
    case "break":
      return Coffee;
    case "meal":
      return Utensils;
    default:
      return null;
  }
};
