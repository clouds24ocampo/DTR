import { AlertCircle } from "lucide-react";

/** Dashboard-style dismissible error banner. Render only when `message` is set. */
export default function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null | undefined;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex min-w-0 items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-semibold">Error:</span>
        <span className="truncate">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 font-medium text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
