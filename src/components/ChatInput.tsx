import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { Mic, SendHorizontal, Square, Volume2, VolumeX } from "lucide-react";
import { MAX_MESSAGE_CHARS } from "../config";
import { useDictation } from "../speech/dictation";
import { primeSpeech, stopSpeaking, ttsSupported } from "../speech/readAloud";

interface ChatInputProps {
  disabled: boolean;
  isStreaming: boolean;
  /** `viaVoice` is true when the doubt was dictated with the mic (its answer is then read aloud). */
  onSend: (text: string, viaVoice: boolean) => void;
  onStop: () => void;
  /** BCP-47 language used for voice typing, e.g. "en-IN". */
  speechLang: string;
  voiceReplies: boolean;
  onToggleVoiceReplies: () => void;
}

export interface ChatInputHandle {
  focus: () => void;
}

function joinDraft(before: string, spoken: string): string {
  if (!before.trim()) return spoken;
  if (!spoken) return before;
  return `${before.replace(/\s+$/, "")} ${spoken}`;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { disabled, isStreaming, onSend, onStop, speechLang, voiceReplies, onToggleVoiceReplies },
  ref,
) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Text typed before the mic was turned on; dictated words are appended after it.
  const draftBeforeMicRef = useRef("");
  // Whether the current draft contains dictated words.
  const usedVoiceRef = useRef(false);

  const dictation = useDictation({
    lang: speechLang,
    onTranscript: (spoken) => {
      if (spoken) usedVoiceRef.current = true;
      setValue(joinDraft(draftBeforeMicRef.current, spoken).slice(0, MAX_MESSAGE_CHARS));
      requestAnimationFrame(autoGrow);
    },
    // The student stopped talking (or tapped stop): send the spoken doubt straight away.
    onFinish: (spoken) => {
      const text = joinDraft(draftBeforeMicRef.current, spoken).slice(0, MAX_MESSAGE_CHARS).trim();
      if (!text || disabled || isStreaming) return; // leave it in the box to send manually
      onSend(text, true);
      setValue("");
      usedVoiceRef.current = false;
      requestAnimationFrame(autoGrow);
    },
  });

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  const { error: dictationError, clearError } = dictation;
  useEffect(() => {
    if (!dictationError) return;
    const timer = setTimeout(clearError, 6000);
    return () => clearTimeout(timer);
  }, [dictationError, clearError]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    // Sending by hand while listening: stop without letting the dictation auto-send it again.
    if (dictation.listening) dictation.cancel();
    const viaVoice = usedVoiceRef.current;
    if (viaVoice || voiceReplies) primeSpeech();
    onSend(trimmed, viaVoice);
    setValue("");
    usedVoiceRef.current = false;
    requestAnimationFrame(autoGrow);
  }

  function toggleMic() {
    if (dictation.listening) {
      dictation.stop(); // done speaking → sends via onFinish
      return;
    }
    stopSpeaking(); // don't let the mic pick up an answer being read aloud
    primeSpeech();
    draftBeforeMicRef.current = value;
    dictation.start();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !disabled && !!value.trim();
  const nearLimit = value.length > MAX_MESSAGE_CHARS - 150;

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white px-3 pb-3 pt-3 sm:px-6 sm:pb-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl">
        <div
          className={clsx(
            "flex items-end gap-1.5 rounded-2xl bg-slate-100 p-1.5 pl-2 ring-1 ring-inset transition focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgb(99_102_241/0.12)] dark:bg-slate-800 dark:focus-within:bg-slate-950",
            dictation.listening
              ? "bg-white shadow-[0_0_0_4px_rgb(244_63_94/0.12)] ring-rose-400 dark:bg-slate-950 dark:ring-rose-500"
              : "ring-transparent focus-within:ring-indigo-400 dark:focus-within:ring-indigo-500",
          )}
        >
          <textarea
            ref={textareaRef}
            className="max-h-[200px] min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 sm:text-[15px] dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder={dictation.listening ? "Listening… speak your doubt" : "Type or speak your doubt…"}
            aria-label="Type your doubt"
            value={value}
            maxLength={MAX_MESSAGE_CHARS}
            disabled={disabled}
            onChange={(e) => {
              setValue(e.target.value);
              if (!e.target.value.trim()) usedVoiceRef.current = false;
              autoGrow();
            }}
            onKeyDown={handleKeyDown}
            rows={1}
          />

          {dictation.supported && !isStreaming && (
            <button
              onClick={toggleMic}
              disabled={disabled}
              aria-label={dictation.listening ? "Stop and send" : "Speak your doubt"}
              aria-pressed={dictation.listening}
              title={dictation.listening ? "Done — send now" : "Speak your doubt"}
              className={clsx(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-90 disabled:opacity-50",
                dictation.listening
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100",
              )}
            >
              {dictation.listening && (
                <span aria-hidden className="absolute inset-0 animate-ping rounded-xl bg-rose-400/40" />
              )}
              {dictation.listening ? <Square size={14} fill="currentColor" className="relative" /> : <Mic size={20} />}
            </button>
          )}

          {isStreaming ? (
            <button
              className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={onStop}
              aria-label="Stop"
            >
              <Square size={11} fill="currentColor" />
              Stop
            </button>
          ) : (
            <button
              className={clsx(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-90 disabled:cursor-not-allowed",
                canSend
                  ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md shadow-indigo-500/30 hover:brightness-110"
                  : "text-blue-500/60 dark:text-blue-400/50",
              )}
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send"
            >
              <SendHorizontal size={20} />
            </button>
          )}
        </div>

        <div className="mt-1.5 flex min-h-[20px] items-center gap-3 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          {dictation.listening ? (
            <span role="status" className="flex items-center gap-1.5 font-medium text-rose-500">
              <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] animate-pulse rounded-full bg-rose-500"
                    style={{ height: `${6 + ((i * 5) % 7)}px`, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              Listening… sends when you stop talking
              <span className="text-rose-300 dark:text-rose-700">·</span>
              <button
                onClick={() => {
                  dictation.cancel();
                  textareaRef.current?.focus();
                }}
                className="font-semibold underline-offset-2 hover:underline"
              >
                Edit first
              </button>
            </span>
          ) : dictation.error ? (
            <span role="alert" className="text-rose-500">
              {dictation.error}
            </span>
          ) : (
            ttsSupported && (
              <button
                role="switch"
                aria-checked={voiceReplies}
                onClick={() => {
                  if (!voiceReplies) primeSpeech();
                  else stopSpeaking();
                  onToggleVoiceReplies();
                }}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold transition",
                  voiceReplies
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300",
                )}
                title="Read every answer aloud"
              >
                {voiceReplies ? <Volume2 size={12} /> : <VolumeX size={12} />}
                Voice replies {voiceReplies ? "on" : "off"}
              </button>
            )
          )}
          <span className="ml-auto hidden sm:inline">
            <b className="font-semibold">Enter</b> to send · <b className="font-semibold">Shift + Enter</b> for a new line
          </span>
          {nearLimit && (
            <span
              className={clsx(
                "ml-auto font-medium tabular-nums sm:ml-0",
                value.length >= MAX_MESSAGE_CHARS ? "text-rose-500" : "text-amber-500",
              )}
            >
              {value.length}/{MAX_MESSAGE_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
