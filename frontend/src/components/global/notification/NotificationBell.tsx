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
  const hasUnread = count > 0;

  return (
    <Tag
      onClick={isButton ? onClick : undefined}
      className={
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-150 hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 active:scale-95 " +
        (isInteractive ? "cursor-pointer" : "cursor-default")
      }
      aria-label={isButton ? `Notifications${hasUnread ? `, ${count > 99 ? 99 : count} unread` : ""}` : undefined}
      type={isButton ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      role={!isButton && isInteractive ? "button" : undefined}
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      {hasUnread && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
      {hasUnread && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 h-[18px] w-[18px] animate-ping rounded-full bg-red-400 opacity-30 [animation-iteration-count:3]"
        />
      )}
    </Tag>
  );
}

export default memo(NotificationBell);
