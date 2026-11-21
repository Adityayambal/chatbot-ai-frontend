import { useEffect, useId, useState } from "react";
import { LoaderCircle, Phone } from "lucide-react";
import Modal from "./Modal";

interface TeacherRequestDialogProps {
  open: boolean;
  onClose: () => void;
  /** Resolves on success; rejects with an Error whose message is shown in the dialog. */
  onSubmit: (note: string) => Promise<void>;
}

const MAX_NOTE_CHARS = 500;

export default function TeacherRequestDialog({ open, onClose, onSubmit }: TeacherRequestDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(note.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't request a call. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId} describedBy={bodyId}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Phone size={18} />
        </span>
        <div>
          <h2 id={titleId} className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Talk to a teacher
          </h2>
          <p id={bodyId} className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            A teacher will call you to help with this doubt. They'll see this chat.
          </p>
        </div>
      </div>

      <label htmlFor={noteId} className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        What's still unclear? (optional)
      </label>
      <textarea
        id={noteId}
        data-autofocus
        value={note}
        maxLength={MAX_NOTE_CHARS}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="mt-1.5 w-full resize-none rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950 dark:focus:ring-indigo-500"
        placeholder="e.g. I still don't get why velocity is zero after one round"
      />
      {note.length > MAX_NOTE_CHARS - 75 && (
        <p className="mt-1 text-right text-[11px] font-medium tabular-nums text-amber-500">
          {note.length}/{MAX_NOTE_CHARS}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
        >
          {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Phone size={16} />}
          Request a call
        </button>
      </div>
    </Modal>
  );
}
