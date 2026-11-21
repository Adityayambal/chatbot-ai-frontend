import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CloudOff,
  GraduationCap,
  LoaderCircle,
  Quote,
  RotateCcw,
  Sigma,
  Sparkles,
} from "lucide-react";
import { ApiError, createSession, getCatalog } from "../api/client";
import CascadingSelect, { type SelectOption } from "../components/CascadingSelect";
import ErrorBanner from "../components/ErrorBanner";
import ThemeToggle from "../components/ThemeToggle";
import { PLAN_ID } from "../config";
import { useSession } from "../state/SessionContext";
import type { CatalogOption } from "../types";

type LoadState = "loading" | "ready" | "error";

const FEATURES = [
  {
    icon: BookOpenCheck,
    title: "From your own lessons",
    text: "Answers come from your class notes, video lessons and practice questions.",
  },
  { icon: Quote, title: "Sources you can check", text: "Every answer shows exactly where it came from." },
  { icon: Sigma, title: "Clear maths & science", text: "Formulas and steps laid out neatly, in simple words." },
];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function distinctOptions(
  items: CatalogOption[],
  idOf: (o: CatalogOption) => string,
  nameOf: (o: CatalogOption) => string,
): SelectOption[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const id = idOf(item);
    if (!seen.has(id)) seen.set(id, nameOf(item));
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}

export default function SelectionPage() {
  const navigate = useNavigate();
  const { setSessionId, lastSelection, setLastSelection } = useSession();

  const [options, setOptions] = useState<CatalogOption[]>([]);
  const [planName, setPlanName] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("Preparing lessons…");
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mediumId, setMediumId] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [cpId, setCpId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function load() {
    setLoadState("loading");
    try {
      const data = await getCatalog([PLAN_ID]);
      setOptions(data.options);
      setPlanName(data.plans[0]?.planName ?? "");
      setLoadState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503 && err.code === "content_loading") {
        const retrySeconds = err.retryAfter ?? 5;
        setLoadMessage("Preparing lessons…");
        retryTimer.current = setTimeout(load, retrySeconds * 1000);
        return;
      }
      setLoadMessage(
        err instanceof ApiError ? err.message : "Lessons are unavailable right now.",
      );
      setLoadState("error");
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore the last valid selection once the catalog is ready.
  useEffect(() => {
    if (loadState !== "ready" || restored) return;
    setRestored(true);
    if (!lastSelection) return;
    const stillValid = options.some((o) => o.cpId === lastSelection.cpId);
    if (stillValid) {
      setMediumId(lastSelection.mediumId);
      setGradeId(lastSelection.gradeId);
      setBoardId(lastSelection.boardId);
      setCpId(lastSelection.cpId);
    }
  }, [loadState, restored, lastSelection, options]);

  const mediums = useMemo(
    () => distinctOptions(options, (o) => o.mediumId, (o) => o.mediumName),
    [options],
  );

  const gradeCandidates = useMemo(
    () => options.filter((o) => !mediumId || o.mediumId === mediumId),
    [options, mediumId],
  );
  const grades = useMemo(
    () => distinctOptions(gradeCandidates, (o) => o.gradeId, (o) => o.gradeName),
    [gradeCandidates],
  );

  const boardCandidates = useMemo(
    () => gradeCandidates.filter((o) => !gradeId || o.gradeId === gradeId),
    [gradeCandidates, gradeId],
  );
  const boards = useMemo(
    () => distinctOptions(boardCandidates, (o) => o.boardId, (o) => o.boardName),
    [boardCandidates],
  );

  const subjectCandidates = useMemo(
    () => boardCandidates.filter((o) => !boardId || o.boardId === boardId),
    [boardCandidates, boardId],
  );
  const subjects = useMemo<SelectOption[]>(() => {
    const nameCounts = new Map<string, number>();
    for (const o of subjectCandidates) {
      nameCounts.set(o.subjectName, (nameCounts.get(o.subjectName) ?? 0) + 1);
    }
    // Each option is keyed by cpId (not subjectId) so two CPs sharing every other
    // value still resolve to distinct, selectable entries — disambiguated by cpName.
    return subjectCandidates.map((o) => ({
      id: o.cpId,
      name: (nameCounts.get(o.subjectName) ?? 0) > 1 ? `${o.subjectName} (${o.cpName})` : o.subjectName,
    }));
  }, [subjectCandidates]);

  // Auto-select whenever a list collapses to exactly one option.
  useEffect(() => {
    if (mediums.length === 1 && mediumId === null) setMediumId(mediums[0].id);
  }, [mediums, mediumId]);
  useEffect(() => {
    if (grades.length === 1 && gradeId === null) setGradeId(grades[0].id);
  }, [grades, gradeId]);
  useEffect(() => {
    if (boards.length === 1 && boardId === null) setBoardId(boards[0].id);
  }, [boards, boardId]);
  useEffect(() => {
    if (subjects.length === 1 && cpId === null) setCpId(subjects[0].id);
  }, [subjects, cpId]);

  function handleMediumChange(id: string) {
    setMediumId(id);
    setGradeId(null);
    setBoardId(null);
    setCpId(null);
  }
  function handleGradeChange(id: string) {
    setGradeId(id);
    setBoardId(null);
    setCpId(null);
  }
  function handleBoardChange(id: string) {
    setBoardId(id);
    setCpId(null);
  }

  const selectedOption = useMemo(() => options.find((o) => o.cpId === cpId) ?? null, [options, cpId]);

  async function handleStart() {
    if (!selectedOption || !mediumId || !gradeId || !boardId) return;
    setStarting(true);
    setStartError(null);
    try {
      const session = await createSession(selectedOption.planId, selectedOption.cpId);
      setLastSelection({ mediumId, gradeId, boardId, cpId: selectedOption.cpId });
      setSessionId(session.sessionId);
      navigate(`/chat/${session.sessionId}`, {
        state: { context: session.context, starterQuestions: session.starterQuestions },
      });
    } catch (err) {
      setStartError(err instanceof ApiError ? err.message : "Could not start a session. Please try again.");
      setStarting(false);
    }
  }

  let card: ReactNode;
  if (loadState === "loading") {
    card = (
      <div aria-busy="true">
        <div className="skeleton h-6 w-44" />
        <div className="skeleton mt-2 h-4 w-28" />
        <div className="mt-7 grid gap-x-4 gap-y-5 short:mt-5 short:gap-y-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={i > 1 ? "sm:col-span-2" : undefined}>
              <div className="skeleton h-3 w-20" />
              <div className="skeleton mt-2 h-12 w-full rounded-xl short:h-11" />
            </div>
          ))}
        </div>
        <div className="skeleton mt-7 h-12 w-full rounded-xl short:mt-5" />
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <LoaderCircle size={16} className="animate-spin text-indigo-500" />
          {loadMessage}
        </p>
      </div>
    );
  } else if (loadState === "error") {
    card = (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-inset ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-500/20">
          <CloudOff size={24} />
        </span>
        <h2 className="mt-5 font-display text-lg font-bold text-slate-900 dark:text-white">Couldn't load lessons</h2>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">{loadMessage}</p>
        <button
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-[0.98] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          onClick={load}
        >
          <RotateCcw size={16} />
          Retry
        </button>
      </div>
    );
  } else {
    card = (
      <>
        <div className="mb-7 short:mb-5">
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Choose your class
          </h2>
          {planName && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{planName}</p>}
        </div>

        <div className="grid gap-x-4 gap-y-5 short:gap-y-4 sm:grid-cols-2">
          <CascadingSelect step={1} label="Medium" value={mediumId} options={mediums} onChange={handleMediumChange} />
          <CascadingSelect
            step={2}
            label="Grade"
            value={gradeId}
            options={grades}
            onChange={handleGradeChange}
            disabled={!mediumId}
          />
          <div className="sm:col-span-2">
            <CascadingSelect
              step={3}
              label="Board"
              value={boardId}
              options={boards}
              onChange={handleBoardChange}
              disabled={!gradeId}
            />
          </div>
          <div className="sm:col-span-2">
            <CascadingSelect
              step={4}
              label="Subject"
              value={cpId}
              options={subjects}
              onChange={setCpId}
              disabled={!boardId}
            />
          </div>
        </div>

        {selectedOption && (
          <div className="mt-6 flex animate-fade-in short:mt-4 short:p-2.5 items-center gap-3 rounded-2xl bg-indigo-50/80 p-3 ring-1 ring-inset ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
              <BookOpen size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {selectedOption.subjectName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {plural(selectedOption.chapterCount, "chapter")} · {plural(selectedOption.conceptCount, "concept")}
              </p>
            </div>
          </div>
        )}

        {startError && (
          <div className="mt-5">
            <ErrorBanner message={startError} />
          </div>
        )}

        <button
          className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-3.5 text-[15px] short:mt-5 short:py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100"
          disabled={!selectedOption || starting}
          onClick={handleStart}
        >
          {starting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Starting…
            </>
          ) : (
            <>
              Start learning
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400 short:mt-2.5 dark:text-slate-500">
          We'll remember your choice for next time.
        </p>
      </>
    );
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-600/20" />
        <div className="absolute -right-32 top-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/15" />
        <div className="absolute -bottom-24 left-1/4 h-[22rem] w-[22rem] rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-600/10" />
      </div>

      <div className="absolute right-4 top-[42px] z-10 short:top-[26px] sm:right-6 lg:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-dvh max-w-6xl content-center gap-10 px-4 py-10 short:py-6 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-16 short:lg:py-6">
        <section>
          <div className="flex items-center gap-2.5">
            <span className="brand-mark h-10 w-10 rounded-xl" aria-hidden>
              <GraduationCap size={20} />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AacharyX
            </span>
            <span className="rounded-md bg-gradient-to-br from-blue-600 to-violet-600 px-1.5 py-px text-[10px] font-bold tracking-wider text-white">
              AI
            </span>
          </div>

          <span className="mt-8 inline-flex items-center gap-1.5 rounded-full short:mt-6 bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 backdrop-blur dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
            <Sparkles size={13} />
            Har doubt ka samadhan
          </span>
          <h1 className="mt-4 font-display text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem] short:lg:text-5xl dark:text-white">
            Stuck on a doubt?
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              Ask AacharyX.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 short:mt-4 sm:text-lg dark:text-slate-400">
            AacharyX is your personal AI teacher. Pick your class and subject, ask anything from your syllabus, and get a
            clear, step-by-step answer based on your own lessons.
          </p>

          <ul className="mt-9 hidden gap-5 short:mt-7 short:gap-4 sm:grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-indigo-400 dark:ring-slate-800">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="w-full lg:max-w-md lg:justify-self-end">
          <div className="animate-fade-in-up rounded-3xl bg-white/80 p-6 shadow-2xl shadow-slate-900/[0.07] ring-1 ring-slate-200/80 backdrop-blur-xl sm:p-8 short:sm:p-6 dark:bg-slate-900/70 dark:shadow-black/30 dark:ring-slate-800">
            {card}
          </div>
        </section>
      </div>
    </div>
  );
}
