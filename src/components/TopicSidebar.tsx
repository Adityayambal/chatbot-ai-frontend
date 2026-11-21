import {
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import { ChevronRight, FileText, ListChecks, Lock, Plus, Search, Sparkles, Video, X } from "lucide-react";
import type { OutlineResponse } from "../types";

type Tab = "chats" | "topics";

interface TopicSidebarProps {
  outline: OutlineResponse | null;
  onSelectConcept: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
  /** Concept clicks are disabled (streaming, or the chat is read-only). */
  disabled?: boolean;
  /** The chat is read-only: show why concept clicks are disabled. */
  readOnly?: boolean;
  onNewChat: () => void;
  /** Content of the Chats tab (the chat history list). */
  chatsPanel: ReactNode;
}

export default function TopicSidebar({
  outline,
  onSelectConcept,
  isOpen,
  onClose,
  disabled,
  readOnly,
  onNewChat,
  chatsPanel,
}: TopicSidebarProps) {
  const [tab, setTab] = useState<Tab>("chats");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const tabsId = useId();

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const needle = query.trim().toLowerCase();
  const chapters = useMemo(() => {
    if (!outline) return [];
    return outline.chapters.flatMap((chapter, index) => {
      const number = index + 1;
      if (!needle || chapter.name.toLowerCase().includes(needle)) {
        return [{ chapter, number, concepts: chapter.concepts }];
      }
      const concepts = chapter.concepts.filter((c) => c.name.toLowerCase().includes(needle));
      return concepts.length > 0 ? [{ chapter, number, concepts }] : [];
    });
  }, [outline, needle]);

  function handleTabKey(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Tab = tab === "chats" ? "topics" : "chats";
    setTab(next);
    document.getElementById(`${tabsId}-${next}-tab`)?.focus();
  }

  const tabButton = (value: Tab, label: string) => (
    <button
      id={`${tabsId}-${value}-tab`}
      role="tab"
      aria-selected={tab === value}
      aria-controls={`${tabsId}-${value}-panel`}
      tabIndex={tab === value ? 0 : -1}
      onClick={() => setTab(value)}
      onKeyDown={handleTabKey}
      className={clsx(
        "flex-1 rounded-lg py-1.5 text-sm font-semibold transition",
        tab === value
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
      )}
    >
      {label}
    </button>
  );

  const topicsPanel = (
    <>
      {outline && (
        <p className="px-4 pb-2 text-xs text-slate-500 dark:text-slate-400">{outline.chapters.length} chapters</p>
      )}
      {readOnly && (
        <p className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Lock size={12} className="shrink-0" />
          Start a new chat to ask about this
        </p>
      )}
      <div className="px-3 pb-2">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics"
            aria-label="Search topics"
            className="w-full rounded-xl border-0 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950 dark:focus:ring-indigo-500"
          />
        </label>
      </div>

      <nav className="px-2 pb-4" aria-label="Chapters">
        {!outline && (
          <div className="flex flex-col gap-2 px-2 pt-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton h-6 w-6 shrink-0 rounded-md" />
                <div className="skeleton h-4 flex-1" />
              </div>
            ))}
          </div>
        )}

        {outline && chapters.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-slate-400">No topics match "{query.trim()}"</p>
        )}

        {chapters.map(({ chapter, number, concepts }) => {
          const isExpanded = needle !== "" || expanded.has(chapter.code);
          return (
            <div key={chapter.code} className="mb-0.5">
              <button
                aria-expanded={isExpanded}
                className={clsx(
                  "flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800/70",
                  isExpanded && "bg-slate-50 dark:bg-slate-800/40",
                )}
                onClick={() => toggle(chapter.code)}
              >
                <span
                  className={clsx(
                    "mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold tabular-nums transition-colors",
                    isExpanded
                      ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  )}
                >
                  {number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                    {chapter.name}
                  </span>
                  <span className="mt-1 flex gap-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {chapter.counts.notes > 0 && (
                      <span className="inline-flex items-center gap-1" title="Revision notes">
                        <FileText size={11} />
                        {chapter.counts.notes}
                      </span>
                    )}
                    {chapter.counts.videos > 0 && (
                      <span className="inline-flex items-center gap-1" title="Video lessons">
                        <Video size={11} />
                        {chapter.counts.videos}
                      </span>
                    )}
                    {chapter.counts.questions > 0 && (
                      <span className="inline-flex items-center gap-1" title="Practice questions">
                        <ListChecks size={11} />
                        {chapter.counts.questions}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className={clsx("mt-1 shrink-0 text-slate-400 transition-transform", isExpanded && "rotate-90")}
                />
              </button>

              {isExpanded && (
                <ul className="my-1 ml-5 border-l border-slate-200 pl-2 dark:border-slate-800">
                  {concepts.map((concept) => (
                    <li key={concept.code}>
                      <button
                        disabled={disabled}
                        className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-50 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                        onClick={() => onSelectConcept(`Explain ${concept.name} from ${chapter.name} in simple words`)}
                      >
                        <span className="flex-1">{concept.name}</span>
                        <Sparkles size={13} className="shrink-0 opacity-0 transition group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {!readOnly && (
        <p className="px-4 pb-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Tap any topic to get a simple explanation.
        </p>
      )}
    </>
  );

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pb-3 pt-3">
        <button
          onClick={onNewChat}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={16} />
          New chat
        </button>
        <button
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <div role="tablist" aria-label="Side menu" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {tabButton("chats", "Chats")}
          {tabButton("topics", "Topics")}
        </div>
      </div>

      <div
        id={`${tabsId}-${tab}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${tab}-tab`}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
      >
        {tab === "chats" ? chatsPanel : topicsPanel}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-white md:block lg:w-80 dark:border-slate-800 dark:bg-slate-900">
        {content}
      </aside>
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs animate-slide-in-left bg-white shadow-2xl dark:bg-slate-900">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
