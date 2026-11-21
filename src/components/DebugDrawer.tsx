import { Bug, ChevronRight } from "lucide-react";
import type { ChatMessage } from "../types";

interface DebugDrawerProps {
  message: ChatMessage;
}

export default function DebugDrawer({ message }: DebugDrawerProps) {
  const debug = message.debug;
  if (!debug) return null;
  return (
    <details className="group w-full overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
      <summary className="flex cursor-pointer select-none list-none items-center gap-2 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 [&::-webkit-details-marker]:hidden">
        <Bug size={14} />
        Debug
        <ChevronRight size={14} className="ml-auto transition-transform group-open:rotate-90" />
      </summary>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
        {JSON.stringify(
          {
            verdict: message.verdict,
            reason: debug.reason,
            matchedTopics: debug.matchedTopics,
            usage: debug.usage,
            latencyMs: debug.latencyMs,
            costUsd: debug.costUsd,
          },
          null,
          2,
        )}
      </pre>
    </details>
  );
}
