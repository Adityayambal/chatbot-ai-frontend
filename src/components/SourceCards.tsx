import { useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Clock,
  ExternalLink,
  FileText,
  type LucideIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Source } from "../types";

interface TypeMeta {
  icon: LucideIcon;
  label: string;
  tone: string;
}

const TYPE_META: Record<Source["type"], TypeMeta> = {
  revision_note: {
    icon: FileText,
    label: "Revision note",
    tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
  },
  video_transcript: {
    icon: CirclePlay,
    label: "Video lesson",
    tone: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
  },
  question: {
    icon: CircleHelp,
    label: "Practice question",
    tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  },
  pdf: {
    icon: BookOpen,
    label: "eBook",
    tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
};

const FALLBACK_TONE = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300";
const MAX_DIFFICULTY = 8;

function formatDuration(seconds?: number | null): string | null {
  if (!seconds) return null;
  return `${Math.round(seconds / 60)} min`;
}

// Snippets are raw lesson text and sometimes carry markdown emphasis/code markers.
function cleanSnippet(text: string): string {
  return text.replace(/\*\*|`/g, "").trim();
}

// Roughly what fits in the 2-line preview; shorter snippets need no "Read full" toggle.
const PREVIEW_CHARS = 120;

const FULL_TEXT_PROSE = clsx(
  "prose prose-sm prose-slate max-w-none text-[13px] leading-relaxed dark:prose-invert",
  "prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:text-sm",
  "prose-code:before:content-none prose-code:after:content-none",
);

function renderSourceRow(source: Source, isExpanded: boolean, onToggle: () => void) {
  const meta = TYPE_META[source.type] ?? { icon: FileText, label: source.type, tone: FALLBACK_TONE };
  const Icon = meta.icon;
  const duration = formatDuration(source.durationSec);
  const isVimeo = !!source.videoUrl?.includes("vimeo.com");

  return (
    <li
      key={source.id}
      data-source-id={source.id}
      className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
    >
      <span className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="rounded bg-purple-900 px-1.5 py-px text-[10px] font-bold text-white">{source.id}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{meta.label}</span>
          {duration && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock size={11} />
              {duration}
            </span>
          )}
          {source.difficulty != null && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-slate-400"
              title={`Difficulty ${source.difficulty}/${MAX_DIFFICULTY}`}
            >
              <span className="flex gap-px" aria-hidden>
                {Array.from({ length: MAX_DIFFICULTY }, (_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      "h-2 w-[3px] rounded-sm",
                      i < Math.round(source.difficulty ?? 0) ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700",
                    )}
                  />
                ))}
              </span>
              Difficulty {source.difficulty}/{MAX_DIFFICULTY}
            </span>
          )}
          {isVimeo && source.videoUrl && (
            <a
              href={source.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
            >
              Open video
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={`${source.chapter} › ${source.concept}`}>
          {source.chapter} › {source.concept}
        </p>
        {source.snippet &&
          (source.snippet.length <= PREVIEW_CHARS ? (
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              {cleanSnippet(source.snippet)}
            </p>
          ) : isExpanded ? (
            <div className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200/70 dark:bg-slate-800/50 dark:ring-slate-700/60">
              <div className={FULL_TEXT_PROSE}>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml>
                  {source.snippet}
                </ReactMarkdown>
              </div>
              <button
                onClick={onToggle}
                aria-expanded
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
              >
                Show less
                <ChevronDown size={13} className="rotate-180" />
              </button>
            </div>
          ) : (
            <button onClick={onToggle} aria-expanded={false} className="group mt-1 block w-full text-left">
              <span className="line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                {cleanSnippet(source.snippet)}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:underline dark:text-indigo-300">
                Read full
                <ChevronDown size={13} />
              </span>
            </button>
          ))}
        {source.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {source.images.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-slate-700"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

interface SourceCardsProps {
  /** The few sources this answer actually relies on — always listed. */
  keySources: Source[];
  /** Everything else that was retrieved — listed only on request. */
  moreSources: Source[];
  showMore: boolean;
  onToggleMore: () => void;
}

export default function SourceCards({ keySources, moreSources, showMore, onToggleMore }: SourceCardsProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const row = (s: Source) => renderSourceRow(s, expanded.has(s.id), () => toggle(s.id));

  if (keySources.length === 0) return null;
  return (
    <section className="w-full animate-fade-in rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80 sm:max-w-[88%] dark:bg-slate-900 dark:ring-slate-800">
      <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Key sources for this answer
      </h3>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {keySources.map(row)}
        {showMore && moreSources.map(row)}
      </ul>
      {moreSources.length > 0 && (
        <button
          onClick={onToggleMore}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          {showMore ? "Show fewer" : `Show ${moreSources.length} more`}
          <ChevronDown size={14} className={clsx("transition-transform", showMore && "rotate-180")} />
        </button>
      )}
    </section>
  );
}
