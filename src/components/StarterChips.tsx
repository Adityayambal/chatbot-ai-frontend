interface StarterChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

const EMOJI = ["🤔", "💡", "📘", "🧪", "✏️"];

export default function StarterChips({ questions, onSelect }: StarterChipsProps) {
  if (questions.length === 0) return null;
  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-6">
      <div className="scrollbar-none -mx-3 flex gap-2 overflow-x-auto px-3 pb-3 sm:mx-0 sm:flex-wrap sm:px-0">
        {questions.map((q, i) => (
          <button
            key={q}
            title={q}
            className="flex max-w-[16rem] shrink-0 animate-fade-in items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-left text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200 active:scale-[0.98] sm:max-w-full dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300 dark:hover:ring-indigo-500/30"
            onClick={() => onSelect(q)}
          >
            <span aria-hidden>{EMOJI[i % EMOJI.length]}</span>
            <span className="truncate sm:whitespace-normal">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
