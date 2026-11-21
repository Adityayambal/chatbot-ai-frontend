import { Link } from "react-router-dom";
import clsx from "clsx";
import { Check, MessagesSquare, Phone, RotateCcw, Star } from "lucide-react";
import { parseServerDate } from "../api/client";
import type { ChatSummary, SessionStatus } from "../types";

interface ChatHistoryListProps {
  chats: ChatSummary[] | null; // null while the first load is in flight
  error: boolean;
  onRetry: () => void;
  currentSessionId: string;
  currentPlanId: string;
  currentCpId: string;
  onNavigate: () => void;
}

interface ChatGroup {
  key: string;
  subject: string;
  meta: string;
  chats: ChatSummary[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeTime(iso: string): string {
  const date = parseServerDate(iso);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (date.getTime() >= startOfToday.getTime() - DAY_MS) return "Yesterday";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
}

// Current subject first, then the others by their most recent chat (the API returns newest first).
function groupChats(chats: ChatSummary[], currentKey: string): ChatGroup[] {
  const groups = new Map<string, ChatGroup>();
  for (const chat of chats) {
    const key = `${chat.planId}:${chat.cpId}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, subject: chat.subject, meta: `Grade ${chat.grade} · ${chat.board}`, chats: [] };
      groups.set(key, group);
    }
    group.chats.push(chat);
  }
  const ordered = Array.from(groups.values());
  const current = ordered.findIndex((g) => g.key === currentKey);
  if (current > 0) ordered.unshift(...ordered.splice(current, 1));
  return ordered;
}

const STATUS_CHIP: Record<SessionStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300" },
  closed: { label: "Solved", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
  teacher_requested: {
    label: "With teacher",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
};

function statusIcon(status: SessionStatus) {
  if (status === "open") return <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden />;
  if (status === "closed") return <Check size={11} strokeWidth={3} aria-hidden />;
  return <Phone size={10} aria-hidden />;
}

export default function ChatHistoryList({
  chats,
  error,
  onRetry,
  currentSessionId,
  currentPlanId,
  currentCpId,
  onNavigate,
}: ChatHistoryListProps) {
  return (
    <div className="flex flex-col gap-4 px-2 pb-4 pt-1">
      {error && (
        <p className="flex items-center justify-center gap-1.5 px-2 text-xs text-slate-500 dark:text-slate-400">
          Couldn't load chats ·
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
          >
            <RotateCcw size={11} />
            Retry
          </button>
        </p>
      )}

      {chats === null && !error && (
        <div className="flex flex-col gap-3 px-2 pt-1" aria-busy="true" aria-label="Loading chats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {chats !== null && chats.length === 0 && (
        <div className="flex flex-col items-center px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <MessagesSquare size={20} />
          </span>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No previous chats yet — your doubts will appear here.
          </p>
        </div>
      )}

      {chats !== null &&
        groupChats(chats, `${currentPlanId}:${currentCpId}`).map((group) => (
          <section key={group.key} aria-label={group.subject}>
            <h3 className="px-2 pb-1.5">
              <span className="block truncate text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {group.subject}
              </span>
              <span className="block truncate text-[11px] text-slate-400 dark:text-slate-500">{group.meta}</span>
            </h3>
            <ul className="flex flex-col gap-0.5">
              {group.chats.map((chat) => {
                const isCurrent = chat.sessionId === currentSessionId;
                const chip = STATUS_CHIP[chat.status];
                return (
                  <li key={chat.sessionId}>
                    <Link
                      to={`/chat/${chat.sessionId}`}
                      onClick={onNavigate}
                      aria-current={isCurrent ? "page" : undefined}
                      className={clsx(
                        "block rounded-xl px-2.5 py-2 transition-colors",
                        isCurrent
                          ? "bg-indigo-50 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/30"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/70",
                      )}
                    >
                      <span
                        className={clsx(
                          "block truncate text-[13px] font-medium",
                          isCurrent ? "text-indigo-900 dark:text-indigo-100" : "text-slate-800 dark:text-slate-100",
                        )}
                        title={chat.title}
                      >
                        {chat.title}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-px font-semibold",
                            chip.className,
                          )}
                        >
                          {statusIcon(chat.status)}
                          {chip.label}
                        </span>
                        <span>{relativeTime(chat.updatedAt)}</span>
                        {chat.rating !== null && (
                          <span className="ml-auto flex items-center gap-px" aria-label={`Rated ${chat.rating} out of 5`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={10}
                                aria-hidden
                                className={
                                  s <= (chat.rating ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 dark:text-slate-600"
                                }
                              />
                            ))}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
