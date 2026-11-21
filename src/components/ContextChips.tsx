import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, Bot, Menu, Phone } from "lucide-react";
import type { SessionContextData } from "../types";
import ThemeToggle from "./ThemeToggle";

interface ContextChipsProps {
  context: SessionContextData;
  onOpenSidebar?: () => void;
  /** Shown only while the chat is open and has at least one answer. */
  onTalkToTeacher?: () => void;
}

const CHIP =
  "inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20";

export default function ContextChips({ context, onOpenSidebar, onTalkToTeacher }: ContextChipsProps) {
  const navigate = useNavigate();

  return (
    <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-blue-300/20 blur-2xl" />

      <div className="relative flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
        {onOpenSidebar && (
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-white/30 transition hover:bg-white/15 active:scale-95 md:hidden"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}

        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg shadow-indigo-950/20 sm:h-11 sm:w-11">
          <Bot size={20} />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-indigo-600" />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-1.5 font-display text-base font-bold leading-tight sm:text-lg">
            <span className="truncate">AacharyX</span>
            <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-px text-[10px] font-bold tracking-wider ring-1 ring-inset ring-white/25">
              AI
            </span>
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="shrink-0">Online</span>
            <span className="text-white/40">·</span>
            <span className="truncate">
              {context.subject}
              <span className="lg:hidden">
                {" "}
                · {context.medium} · Grade {context.grade} · {context.board}
              </span>
            </span>
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <span className={CHIP}>{context.medium}</span>
          <span className={CHIP}>Grade {context.grade}</span>
          <span className={CHIP}>{context.board}</span>
        </div>

        {onTalkToTeacher && (
          <button
            className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-400/90 px-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300 active:scale-95 xl:px-4"
            onClick={onTalkToTeacher}
            aria-label="Talk to a teacher"
            title="Talk to a teacher"
          >
            <Phone size={15} />
            <span className="hidden xl:inline">Talk to a teacher</span>
          </button>
        )}

        <ThemeToggle variant="onBrand" collapseOnMobile />

        <button
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-white/15 px-2.5 text-sm font-semibold ring-1 ring-inset ring-white/25 transition hover:bg-white/25 active:scale-95 sm:px-4"
          onClick={() => navigate("/")}
          aria-label="Change subject"
        >
          <ArrowLeftRight size={16} />
          <span className="hidden sm:inline">Change subject</span>
        </button>
      </div>
    </header>
  );
}
