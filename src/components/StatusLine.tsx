import clsx from "clsx";
import type { Stage } from "../types";

const STAGES: Stage[] = ["checking", "searching", "writing"];

const LABELS: Record<Stage, string> = {
  checking: "Checking your question…",
  searching: "Searching your lessons…",
  writing: "Writing your answer…",
};

export default function StatusLine({ stage }: { stage: Stage }) {
  const current = STAGES.indexOf(stage);
  return (
    <div role="status" aria-live="polite" className="bubble-bot w-fit">
      <div className="flex items-center gap-3">
        <span className="typing-dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="shimmer-text text-sm font-medium">{LABELS[stage]}</span>
      </div>
      <div className="mt-2.5 flex gap-1" aria-hidden>
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={clsx(
              "h-1 w-10 rounded-full transition-colors duration-500",
              i <= current ? "bg-violet-200" : "bg-white/15",
            )}
          />
        ))}
      </div>
    </div>
  );
}
