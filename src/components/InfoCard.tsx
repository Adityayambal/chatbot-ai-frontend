import { ArrowRight, Compass } from "lucide-react";

interface InfoCardProps {
  content: string;
  suggestedSubject?: string | null;
  onSwitchSubject?: () => void;
}

export default function InfoCard({ content, suggestedSubject, onSwitchSubject }: InfoCardProps) {
  return (
    <div className="flex max-w-full gap-3 rounded-2xl rounded-bl-md bg-amber-50 p-4 shadow-sm ring-1 ring-inset ring-amber-200/80 dark:bg-amber-500/10 dark:ring-amber-500/20">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        <Compass size={18} />
      </span>
      <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-amber-950 dark:text-amber-100">
        <p className="whitespace-pre-line">{content}</p>
        {suggestedSubject && onSwitchSubject && (
          <button
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.98]"
            onClick={onSwitchSubject}
          >
            Switch to {suggestedSubject}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
