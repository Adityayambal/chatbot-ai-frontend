import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, Bot } from "lucide-react";
import type { ChatMessage } from "../types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: ChatMessage[];
  subject: string;
  showDebug: boolean;
  speechLang: string;
  /** Read-only chats can't be retried — nothing may be sent to them. */
  readOnly: boolean;
  onRetry: (messageId: string) => void;
  onFeedback: (messageId: string, rating: 1 | -1) => void;
  onSwitchSubject?: (subjectName: string) => void;
  /** Rendered directly under the message with this ID (the "Did this solve your doubt?" card). */
  afterMessage?: { id: string; node: ReactNode } | null;
  /** Rendered after the last message (the rating card). */
  footer?: ReactNode;
}

const SCROLL_BOTTOM_THRESHOLD_PX = 80;

export default function MessageList({
  messages,
  subject,
  showDebug,
  speechLang,
  readOnly,
  onRetry,
  onFeedback,
  onSwitchSubject,
  afterMessage,
  footer,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (!autoScroll) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, autoScroll]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_BOTTOM_THRESHOLD_PX;
    setAutoScroll(atBottom);
  }

  function scrollToBottom() {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} onScroll={handleScroll} className="scrollbar-thin h-full overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-3 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col items-start gap-2">
            <div className="bubble-bot max-w-[88%] text-[15px] leading-relaxed sm:max-w-[80%]">
              <p>
                Namaste! 🙏 I'm <strong className="font-semibold text-white">AacharyX</strong>, your{" "}
                <strong className="font-semibold text-white">{subject}</strong> tutor.
              </p>
              <p className="mt-1.5 text-violet-100/90">
                Ask me any doubt and I'll explain it step by step from your lessons. Har doubt ka samadhan!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="avatar-bot" aria-hidden>
                <Bot size={16} />
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">AacharyX</span>
            </div>
          </div>

          {messages.map((m) => (
            <Fragment key={m.id}>
              <MessageBubble
                message={m}
                showDebug={showDebug}
                speechLang={speechLang}
                onRetry={readOnly ? undefined : () => onRetry(m.id)}
                onFeedback={(rating) => onFeedback(m.id, rating)}
                onSwitchSubject={onSwitchSubject}
              />
              {afterMessage?.id === m.id && afterMessage.node}
            </Fragment>
          ))}
          {footer}
        </div>
      </div>

      {!autoScroll && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 left-1/2 flex h-10 w-10 -translate-x-1/2 animate-fade-in items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700 dark:hover:bg-slate-700"
        >
          <ArrowDown size={18} />
        </button>
      )}
    </div>
  );
}
