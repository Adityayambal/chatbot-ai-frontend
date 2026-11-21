import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import {
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Library,
  Square,
  ThumbsDown,
  ThumbsUp,
  User,
  Volume2,
} from "lucide-react";
import { parseServerDate } from "../api/client";
import { speakAnswer, stopSpeaking, ttsSupported, useSpeakingId } from "../speech/readAloud";
import { PENDING_USER_ID } from "../state/chatReducer";
import type { ChatMessage, Source } from "../types";
import DebugDrawer from "./DebugDrawer";
import ErrorBanner from "./ErrorBanner";
import InfoCard from "./InfoCard";
import MarkdownAnswer from "./MarkdownAnswer";
import SourceCards from "./SourceCards";
import StatusLine from "./StatusLine";

interface MessageBubbleProps {
  message: ChatMessage;
  showDebug: boolean;
  /** BCP-47 language for reading the answer aloud, e.g. "en-IN". */
  speechLang: string;
  onRetry?: () => void;
  onFeedback: (rating: 1 | -1) => void;
  onSwitchSubject?: (subjectName: string) => void;
}

const INFO_VERDICTS = new Set(["not_related", "unsafe"]);

// Actions sit inside the purple answer bubble ("dark") or under the light InfoCard ("light").
const ACTION_TONES = {
  dark: {
    pill: "bg-white/10 ring-white/15",
    idle: "text-white/70 hover:bg-white/15 hover:text-white",
    up: "bg-emerald-400/20 text-emerald-300",
    down: "bg-rose-400/20 text-rose-300",
  },
  light: {
    pill: "bg-white shadow-sm ring-slate-200 dark:bg-slate-800 dark:ring-slate-700",
    idle: "text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200",
    up: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    down: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  },
} as const;

const ACTION_BUTTON = "flex h-7 w-7 items-center justify-center rounded-md transition active:scale-90";

const MAX_KEY_SOURCES = 3;

// Key sources = the ones the answer actually cites (capped); if it cites none, the top-ranked few.
// Everything else stays behind "Show more" so the chat isn't flooded with cards.
function splitSources(sources: Source[], content: string): { keySources: Source[]; moreSources: Source[] } {
  const citedIds = new Set((content.match(/\[S\d+\]/g) ?? []).map((m) => m.slice(1, -1)));
  const cited = sources.filter((s) => citedIds.has(s.id));
  const ranked = cited.length > 0 ? [...cited, ...sources.filter((s) => !citedIds.has(s.id))] : sources;
  const keyCount = Math.min(MAX_KEY_SOURCES, cited.length > 0 ? cited.length : MAX_KEY_SOURCES);
  return { keySources: ranked.slice(0, keyCount), moreSources: ranked.slice(keyCount) };
}

function formatTime(iso?: string): string | null {
  const date = parseServerDate(iso);
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
}

export default function MessageBubble({
  message,
  showDebug,
  speechLang,
  onRetry,
  onFeedback,
  onSwitchSubject,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<1 | -1 | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [showMoreSources, setShowMoreSources] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const keyIdsRef = useRef<Set<string>>(new Set());
  const time = formatTime(message.createdAt);
  const isSpeaking = useSpeakingId() === message.id;

  const sources = message.sources ?? [];
  const { keySources, moreSources } = splitSources(sources, message.content);
  keyIdsRef.current = new Set(keySources.map((s) => s.id));

  // Stable identity (reads key ids from a ref) so MarkdownAnswer's memoized components don't churn.
  const revealSource = useCallback((id: string) => {
    setSourcesOpen(true);
    if (!keyIdsRef.current.has(id)) setShowMoreSources(true);
    // The click handler's state updates are flushed before the next frame, so the row exists by then.
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-source-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("source-flash");
      void el.offsetWidth; // restart the animation if the same source is revealed again
      el.classList.add("source-flash");
      setTimeout(() => el.classList.remove("source-flash"), 1600);
    });
  }, []);

  if (message.role === "user") {
    const delivered = message.id !== PENDING_USER_ID;
    return (
      <div className="flex flex-col items-end gap-2 pl-10 sm:pl-20">
        <div className="bubble-user">{message.content}</div>
        <div className="flex items-center gap-1.5">
          {time && <span className="text-[11px] text-slate-400 dark:text-slate-500">{time}</span>}
          <span role="img" aria-label={delivered ? "Delivered" : "Sending"}>
            {delivered ? (
              <CheckCheck size={15} className="text-blue-500" />
            ) : (
              <Check size={15} className="text-slate-400" />
            )}
          </span>
          <span className="avatar-user" aria-hidden>
            <User size={15} />
          </span>
        </div>
      </div>
    );
  }

  const isInfoCard = !!message.verdict && INFO_VERDICTS.has(message.verdict);
  const isDone = message.status !== "streaming" && message.status !== "error";
  const tone = ACTION_TONES[isInfoCard ? "light" : "dark"];

  function handleCopy() {
    navigator.clipboard?.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleFeedback(rating: 1 | -1) {
    setFeedback(rating);
    onFeedback(rating);
  }

  const actions = isDone && message.content && (
    <div className={clsx("inline-flex items-center gap-0.5 rounded-lg p-0.5 ring-1 ring-inset", tone.pill)}>
      {ttsSupported && (
        <button
          onClick={() => (isSpeaking ? stopSpeaking() : speakAnswer(message.id, message.content, speechLang))}
          className={clsx(ACTION_BUTTON, isSpeaking ? tone.up : tone.idle)}
          aria-label={isSpeaking ? "Stop reading aloud" : "Listen to this answer"}
          aria-pressed={isSpeaking}
          title={isSpeaking ? "Stop" : "Listen"}
        >
          {isSpeaking ? <Square size={11} fill="currentColor" className="animate-pulse" /> : <Volume2 size={15} />}
        </button>
      )}
      <button
        onClick={handleCopy}
        className={clsx(ACTION_BUTTON, copied ? tone.up : tone.idle)}
        aria-label={copied ? "Copied" : "Copy answer"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <button
        onClick={() => handleFeedback(1)}
        className={clsx(ACTION_BUTTON, feedback === 1 ? tone.up : tone.idle)}
        aria-label="Good answer"
        aria-pressed={feedback === 1}
        title="Helpful"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        className={clsx(ACTION_BUTTON, feedback === -1 ? tone.down : tone.idle)}
        aria-label="Bad answer"
        aria-pressed={feedback === -1}
        title="Not helpful"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className="flex flex-col items-start gap-2 sm:pr-10">
      {message.status === "streaming" && message.stage && !message.content && <StatusLine stage={message.stage} />}

      {isInfoCard
        ? message.content && (
            <>
              <InfoCard
                content={message.content}
                suggestedSubject={message.suggestedSubject}
                onSwitchSubject={
                  onSwitchSubject && message.suggestedSubject
                    ? () => onSwitchSubject(message.suggestedSubject as string)
                    : undefined
                }
              />
              {actions}
            </>
          )
        : message.content && (
            <div className="bubble-bot min-w-0 max-w-full">
              <MarkdownAnswer
                content={message.content}
                streaming={message.status === "streaming"}
                onCitationClick={revealSource}
              />
              {(keySources.length > 0 || actions) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {keySources.length > 0 && (
                    <button
                      onClick={() => setSourcesOpen((open) => !open)}
                      aria-expanded={sourcesOpen}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-xs font-semibold text-white/90 ring-1 ring-inset ring-white/15 transition hover:bg-white/15 hover:text-white active:scale-95"
                    >
                      <Library size={14} />
                      {sourcesOpen ? "Hide sources" : "View sources"}
                      <span className="rounded-full bg-white/20 px-1.5 text-[10px] tabular-nums">{sources.length}</span>
                      <ChevronDown size={14} className={clsx("transition-transform", sourcesOpen && "rotate-180")} />
                    </button>
                  )}
                  {actions && <div className="ml-auto">{actions}</div>}
                </div>
              )}
            </div>
          )}

      {message.status === "interrupted" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Square size={9} fill="currentColor" />
          Stopped
        </span>
      )}

      {sourcesOpen && (
        <SourceCards
          keySources={keySources}
          moreSources={moreSources}
          showMore={showMoreSources}
          onToggleMore={() => setShowMoreSources((more) => !more)}
        />
      )}

      {message.status === "error" && message.error && (
        <div className="w-full">
          <ErrorBanner message={message.error.message} onRetry={onRetry} />
        </div>
      )}

      {showDebug && <DebugDrawer message={message} />}

      <div className="flex items-center gap-2">
        <span className="avatar-bot" aria-hidden>
          <Bot size={16} />
        </span>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {time ? `AacharyX · ${time}` : "AacharyX"}
          {feedback !== null && " · Thanks for the feedback!"}
        </span>
        {isSpeaking && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-300">
            <Volume2 size={12} className="animate-pulse" />
            Speaking…
          </span>
        )}
      </div>
    </div>
  );
}
