import { useEffect, useId, useRef } from "react";
import { CircleCheck, LoaderCircle, MessageCircleQuestion, Phone } from "lucide-react";

interface ClosePromptProps {
  closing: boolean;
  error?: string | null;
  onYes: () => void;
  onNo: () => void;
  onTeacher: () => void;
}

export default function ClosePrompt({ closing, error, onYes, onNo, onTeacher }: ClosePromptProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      className="w-full animate-fade-in rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:max-w-[88%] dark:bg-slate-900 dark:ring-slate-800"
    >
      <p id={titleId} className="font-display text-[15px] font-semibold text-slate-900 dark:text-white">
        Did this solve your doubt?
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          onClick={onYes}
          disabled={closing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {closing ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
          Yes, close doubt
        </button>
        <button
          onClick={onNo}
          disabled={closing}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          <MessageCircleQuestion size={16} />
          No, I have more questions
        </button>
      </div>
      <button
        onClick={onTeacher}
        disabled={closing}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-400"
      >
        <Phone size={14} />
        Still not solved? Talk to a teacher
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
