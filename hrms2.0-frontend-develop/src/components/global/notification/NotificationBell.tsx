import { Bell } from "lucide-react";
import { memo } from "react";

type Props = {
  count?: number;
  onClick?: () => void;
  as?: "button" | "span";
};

function NotificationBell({ count = 0, onClick, as }: Props) {
  const Tag = as || (onClick ? "button" : "span");
  const isButton = Tag === "button";
  const isInteractive = isButton || !!onClick;

  return (
    <Tag
      onClick={isButton ? onClick : undefined}
      className={
        "relative flex justify-center px-3 py-2 text-sm bg-slate-700/80 border border-slate-600 rounded-lg text-slate-200 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 " +
        (isInteractive ? "cursor-pointer" : "cursor-default")
      }
      aria-label={isButton ? "Notifications" : undefined}
      type={isButton ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      role={!isButton && isInteractive ? "button" : undefined}
    >
      <Bell />
      {count > 0 && (
        <span
          className="
            absolute -top-1.5 -right-1.5
            min-w-[18px] h-[18px] px-1
            rounded-full text-xs
            flex items-center justify-center
            bg-[#ff4d4f] text-white
            font-medium
          "
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Tag>
  );
}

export default memo(NotificationBell);
