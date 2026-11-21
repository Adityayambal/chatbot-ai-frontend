import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  id: string;
  name: string;
}

interface CascadingSelectProps {
  step: number;
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
}

export default function CascadingSelect({ step, label, value, options, onChange, disabled }: CascadingSelectProps) {
  const isDisabled = disabled || options.length === 0;
  const isDone = !!value;

  return (
    <label className={clsx("block transition-opacity", isDisabled && "opacity-60")}>
      <span className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span
          className={clsx(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
            isDone
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
              : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          )}
        >
          {isDone ? <Check size={12} strokeWidth={3} /> : step}
        </span>
        {label}
      </span>
      <span className="relative block">
        <select
          className={clsx(
            "w-full cursor-pointer appearance-none truncate rounded-xl border-0 bg-white py-3 pl-4 pr-10 short:py-2.5 text-[15px] font-medium shadow-sm ring-1 ring-inset ring-slate-200 transition",
            "hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:shadow-none",
            "dark:bg-slate-950/60 dark:ring-slate-700 dark:hover:ring-slate-600 dark:focus:ring-indigo-400 dark:disabled:bg-slate-900",
            "[&>option]:text-slate-900 dark:[&>option]:text-slate-100",
            isDone ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500",
          )}
          value={value ?? ""}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </span>
    </label>
  );
}
