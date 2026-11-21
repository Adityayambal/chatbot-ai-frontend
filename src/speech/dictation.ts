import { useCallback, useEffect, useRef, useState } from "react";

// Speech-to-text for the doubt input via the browser's SpeechRecognition (Chrome, Edge, Safari).
// TypeScript's DOM lib doesn't ship these types, so the minimal surface used here is declared.

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}

interface RecognitionResultList {
  readonly length: number;
  [index: number]: RecognitionResult;
}

interface RecognitionEvent extends Event {
  readonly results: RecognitionResultList;
}

interface RecognitionErrorEvent extends Event {
  readonly error: string;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const dictationSupported = recognitionConstructor() !== null;

// Give up if nothing is said at all within this time.
const NO_SPEECH_TIMEOUT_MS = 8000;
// Once the student has spoken, this much silence after the last recognised word means they're
// done — long enough to pause and think mid-sentence, short enough to feel responsive.
const END_OF_SPEECH_MS = 1800;

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access is blocked. Allow the mic for this site in your browser settings.",
  "service-not-allowed": "Microphone access is blocked. Allow the mic for this site in your browser settings.",
  "audio-capture": "No microphone found. Check that one is connected.",
  "no-speech": "Didn't catch that — tap the mic and try again.",
  network: "Voice typing needs an internet connection.",
  "language-not-supported": "Voice typing isn't available for this language in your browser.",
};

interface UseDictationOptions {
  lang: string;
  /** Called with the full transcript so far (final + in-progress words) on every update. */
  onTranscript: (text: string) => void;
  /**
   * Called once with the final transcript when the student finishes speaking (silence) or taps
   * stop. Not called after cancel(), an error, or when nothing was said.
   */
  onFinish?: (text: string) => void;
}

export function useDictation({ lang, onTranscript, onFinish }: UseDictationOptions) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const failedRef = useRef(false);
  const cancelledRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const armTimer = useCallback((ms: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => recognitionRef.current?.stop(), ms);
  }, []);

  /** Finish now: the transcript so far is delivered through onFinish. */
  const stop = useCallback(() => {
    clearTimer();
    recognitionRef.current?.stop();
  }, []);

  /** Stop listening without delivering onFinish (the text stays wherever onTranscript put it). */
  const cancel = useCallback(() => {
    clearTimer();
    cancelledRef.current = true;
    recognitionRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionConstructor();
    if (!Ctor || recognitionRef.current) return;
    setError(null);
    transcriptRef.current = "";
    failedRef.current = false;
    cancelledRef.current = false;
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      // With continuous recognition `results` holds the whole session, so rebuild it each time.
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      transcriptRef.current = text.replace(/\s+/g, " ").trim();
      onTranscriptRef.current(transcriptRef.current);
      if (transcriptRef.current) armTimer(END_OF_SPEECH_MS);
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      failedRef.current = true;
      setError(ERROR_MESSAGES[event.error] ?? "Voice typing stopped unexpectedly. Please try again.");
    };
    recognition.onend = () => {
      clearTimer();
      recognitionRef.current = null;
      setListening(false);
      if (failedRef.current || cancelledRef.current) return;
      if (transcriptRef.current) onFinishRef.current?.(transcriptRef.current);
      else setError(ERROR_MESSAGES["no-speech"]);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      armTimer(NO_SPEECH_TIMEOUT_MS);
    } catch {
      recognitionRef.current = null;
      setError("Couldn't start voice typing. Please try again.");
    }
  }, [lang, armTimer]);

  useEffect(
    () => () => {
      clearTimer();
      cancelledRef.current = true;
      recognitionRef.current?.abort();
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return { supported: dictationSupported, listening, error, start, stop, cancel, clearError };
}
