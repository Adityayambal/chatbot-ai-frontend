import { CircleCheck, LoaderCircle, Phone, Plus, Star } from "lucide-react";
import { parseServerDate } from "../api/client";

interface ReadOnlyFooterProps {
  status: "closed" | "teacher_requested";
  subject: string;
  rating: number | null;
  teacherRequestedAt: string | null;
  starting: boolean;
  error?: string | null;
  onNewChat: () => void;
  /** Shown as a "Rate this chat" link; omit to hide it (already rated, or the rating card is open). */
  onRate?: () => void;
}

function formatRequestDate(iso: string | null): string {
  const date = parseServerDate(iso) ?? new Date();
  return date.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function ReadOnlyFooter({
  status,
  subject,
  rating,
  teacherRequestedAt,
  starting,
  error,
  onNewChat,
  onRate,
}: ReadOnlyFooterProps) {
  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white px-3 py-3 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
          {status === "closed" ? (
            <>
              <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CircleCheck size={15} />
              </span>
              <p className="leading-6 text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Doubt solved</span>
                {rating !== null && (
                  <span className="text-slate-500 dark:text-slate-400">
                    {" "}
                    · Rated {rating}
                    <Star size={12} className="mb-0.5 ml-0.5 inline fill-amber-400 text-amber-400" />
                  </span>
                )}
                {onRate && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600"> · </span>
                    <button
                      onClick={onRate}
                      className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                    >
                      Rate this chat
                    </button>
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Phone size={13} />
              </span>
              <p className="leading-6 text-slate-700 dark:text-slate-200">
                <span className="font-semibold">Teacher call requested on {formatRequestDate(teacherRequestedAt)}.</span>{" "}
                A teacher will contact you to solve this doubt.
              </p>
            </>
          )}
        </div>
        <button
          onClick={onNewChat}
          disabled={starting}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {starting ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
          Start a new chat in {subject}
        </button>
      </div>
      {error && (
        <p role="alert" className="mx-auto mt-2 max-w-3xl text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
