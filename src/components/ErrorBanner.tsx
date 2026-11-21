import { RotateCcw, TriangleAlert } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20"
    >
      <TriangleAlert size={18} className="shrink-0 text-rose-500" />
      <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
      {onRetry && (
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100 active:scale-95 dark:bg-rose-500/20 dark:text-rose-100 dark:ring-rose-500/30 dark:hover:bg-rose-500/30"
          onClick={onRetry}
        >
          <RotateCcw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
