import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { LoaderCircle, Star } from "lucide-react";

interface ChatRatingProps {
  /** Resolves on success (the caller treats 409 feedback_exists as success); rejects on failure. */
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSkip: () => void;
}

const STARS = [1, 2, 3, 4, 5];
const MAX_COMMENT_CHARS = 1000;

export default function ChatRating({ onSubmit, onSkip }: ChatRatingProps) {
  const titleId = useId();
  const commentId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const starRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  function choose(value: number) {
    setRating(value);
    starRefs.current[value - 1]?.focus();
  }

  function handleStarKey(e: KeyboardEvent<HTMLButtonElement>, value: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      choose(Math.min(5, value + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      choose(Math.max(1, value - 1));
    }
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(rating, comment.trim());
      setDone(true);
    } catch {
      setError("Couldn't send your rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const shown = hover || rating;

  if (done) {
    return (
      <div
        ref={cardRef}
        role="status"
        className="w-full animate-fade-in rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800"
      >
        <p className="font-display text-[15px] font-semibold text-slate-900 dark:text-white">Thanks for your feedback!</p>
        <div className="mt-2 flex justify-center gap-1" aria-label={`${rating} out of 5 stars`}>
          {STARS.map((s) => (
            <Star
              key={s}
              size={20}
              className={s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="w-full animate-fade-in rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800"
    >
      <p id={titleId} className="font-display text-[15px] font-semibold text-slate-900 dark:text-white">
        How helpful was this chat?
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Optional — it helps us improve.</p>

      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="mt-3 flex gap-1"
        onMouseLeave={() => setHover(0)}
      >
        {STARS.map((s) => (
          <button
            key={s}
            ref={(el) => {
              starRefs.current[s - 1] = el;
            }}
            role="radio"
            aria-checked={rating === s}
            aria-label={`${s} out of 5 stars`}
            tabIndex={rating === s || (rating === 0 && s === 1) ? 0 : -1}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onKeyDown={(e) => handleStarKey(e, s)}
            className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Star
              size={28}
              className={clsx(
                "transition-colors",
                s <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600",
              )}
            />
          </button>
        ))}
      </div>

      <label htmlFor={commentId} className="sr-only">
        Comment (optional)
      </label>
      <textarea
        id={commentId}
        value={comment}
        maxLength={MAX_COMMENT_CHARS}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Anything else you'd like to tell us? (optional)"
        className="mt-3 w-full resize-none rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950 dark:focus:ring-indigo-500"
      />
      {comment.length > MAX_COMMENT_CHARS - 150 && (
        <p className="mt-1 text-right text-[11px] font-medium tabular-nums text-amber-500">
          {comment.length}/{MAX_COMMENT_CHARS}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={onSkip}
          className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting && <LoaderCircle size={16} className="animate-spin" />}
          Submit
        </button>
      </div>
    </div>
  );
}
