import { useState } from "react";
import clsx from "clsx";
import { Moon, Sun } from "lucide-react";

// Same key the inline script in index.html reads before first paint.
const THEME_KEY = "ts-doubt-chat:theme";
const TRANSITION_MS = 350;

const VARIANTS = {
  default: {
    track: "bg-white/80 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-700",
    thumb: "bg-gradient-to-br from-blue-600 to-violet-600",
    active: "text-white",
    idle: "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
  },
  onBrand: {
    track: "bg-white/15 ring-white/25",
    thumb: "bg-white",
    active: "text-indigo-600",
    idle: "text-white/80 hover:text-white",
  },
} as const;

interface ThemeToggleProps {
  variant?: keyof typeof VARIANTS;
  /** Below the `sm` breakpoint, show a single icon button instead of the two-option switch. */
  collapseOnMobile?: boolean;
}

export default function ThemeToggle({ variant = "default", collapseOnMobile = false }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const styles = VARIANTS[variant];

  function apply(dark: boolean) {
    if (dark === isDark) return;
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", dark);
    setTimeout(() => root.classList.remove("theme-transition"), TRANSITION_MS);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // private browsing — the theme still applies for this visit
    }
    setIsDark(dark);
  }

  return (
    <>
      {collapseOnMobile && (
        <button
          onClick={() => apply(!isDark)}
          aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
          title={isDark ? "Day mode" : "Night mode"}
          className={clsx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition active:scale-90 sm:hidden",
            styles.track,
            styles.idle,
          )}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      )}

      <div
        role="radiogroup"
        aria-label="Theme"
        className={clsx(
          "relative h-9 shrink-0 items-center rounded-full p-1 ring-1 ring-inset",
          collapseOnMobile ? "hidden sm:flex" : "flex",
          styles.track,
        )}
      >
        <span
          aria-hidden
          className={clsx(
            "absolute left-1 top-1 h-7 w-7 rounded-full shadow-sm transition-transform duration-300 ease-out",
            styles.thumb,
            isDark && "translate-x-7",
          )}
        />
        <button
          role="radio"
          aria-checked={!isDark}
          aria-label="Day mode"
          title="Day mode"
          onClick={() => apply(false)}
          className={clsx(
            "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            isDark ? styles.idle : styles.active,
          )}
        >
          <Sun size={15} />
        </button>
        <button
          role="radio"
          aria-checked={isDark}
          aria-label="Night mode"
          title="Night mode"
          onClick={() => apply(true)}
          className={clsx(
            "relative flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            isDark ? styles.active : styles.idle,
          )}
        >
          <Moon size={15} />
        </button>
      </div>
    </>
  );
}
