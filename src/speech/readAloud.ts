import { useSyncExternalStore } from "react";

// Text-to-speech for answers via the browser's built-in speechSynthesis (no backend, no keys).
// Only one answer speaks at a time; components subscribe to which one via useSpeakingId().

export const ttsSupported =
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const VOICE_REPLIES_KEY = "ts-doubt-chat:voiceReplies";
// Chrome cuts off long utterances (~15 s), so answers are spoken as a queue of short chunks.
const MAX_CHUNK_CHARS = 220;

/** BCP-47 language for speech, from the session's medium name. */
export function speechLangFor(medium: string): string {
  const m = medium.toLowerCase();
  if (m.includes("hindi")) return "hi-IN";
  if (m.includes("marathi")) return "mr-IN";
  return "en-IN";
}

export function readVoiceReplies(): boolean {
  try {
    return localStorage.getItem(VOICE_REPLIES_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeVoiceReplies(on: boolean): void {
  try {
    localStorage.setItem(VOICE_REPLIES_KEY, String(on));
  } catch {
    // private browsing — the toggle still works for this visit
  }
}

// ---- Markdown/LaTeX → natural speech -------------------------------------------------------

const LATEX_WORDS: Array<[RegExp, string]> = [
  [/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, " $1 over $2 "],
  [/\\sqrt\{([^{}]*)\}/g, " square root of $1 "],
  [/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, " $1 "],
  [/\^\{?2\}?/g, " squared "],
  [/\^\{?3\}?/g, " cubed "],
  [/\^\{([^{}]*)\}/g, " to the power $1 "],
  [/\^(\w)/g, " to the power $1 "],
  [/_\{([^{}]*)\}/g, " $1 "],
  [/\\times|\\cdot/g, " times "],
  [/\\div/g, " divided by "],
  [/\\pm/g, " plus or minus "],
  [/\\(?:le|leq)\b/g, " less than or equal to "],
  [/\\(?:ge|geq)\b/g, " greater than or equal to "],
  [/\\(?:ne|neq)\b/g, " not equal to "],
  [/\\approx/g, " approximately "],
  [/\\(?:rightarrow|to)\b/g, " gives "],
  [/\\vec\{([^{}]*)\}/g, " $1 "],
  [/\\(Delta|delta|pi|theta|alpha|beta|gamma|lambda|mu|omega|sigma|rho)\b/g, " $1 "],
  [/\\[a-zA-Z]+/g, " "],
  [/=/g, " equals "],
  [/</g, " less than "],
  [/>/g, " greater than "],
  [/\+/g, " plus "],
  [/(\w)\s*-\s*(\w)/g, "$1 minus $2"],
  [/\//g, " over "],
  [/[{}]/g, " "],
];

function mathToWords(tex: string): string {
  let out = tex;
  for (const [pattern, words] of LATEX_WORDS) out = out.replace(pattern, words);
  return ` ${out} `;
}

const UNITS: Array<[RegExp, string]> = [
  [/\bm\/s(?:\^?2|²)/g, "metres per second squared"],
  [/\bkm\/h(?:r)?\b/g, "kilometres per hour"],
  [/\bm\/s\b/g, "metres per second"],
  [/\bcm\/s\b/g, "centimetres per second"],
];

/** Turns an answer's markdown into text that sounds natural when spoken. */
export function toSpeakableText(markdown: string): string {
  let text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[S\d+\]/g, "")
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => `. ${mathToWords(tex)}. `)
    .replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => mathToWords(tex))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, "") // table separator rows
    .replace(/_{3,}/g, " blank ")
    .replace(/\*\*|__|`/g, "")
    .replace(/(^|\s)[*_](\S)/g, "$1$2")
    .replace(/(\S)[*_](?=\s|$|[.,!?])/g, "$1")
    .replace(/\p{Extended_Pictographic}/gu, "");
  for (const [pattern, words] of UNITS) text = text.replace(pattern, words);

  // Headings, list items and table rows become their own sentences, so the voice pauses between them.
  text = text
    .split("\n")
    .map((line) =>
      line.includes("|")
        ? line
            .split("|")
            .map((cell) => cell.trim())
            .filter(Boolean)
            .join(", ")
        : line.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)/, "").trim(),
    )
    .filter(Boolean)
    .map((line) => (/[.!?:;।]$/.test(line) ? line : `${line}.`))
    .join(" ");

  return text.replace(/\s+([.,!?;:])/g, "$1").replace(/([.,])\1+/g, "$1").replace(/\s{2,}/g, " ").trim();
}

function chunk(text: string): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ---- Voice choice --------------------------------------------------------------------------

// The tutor speaks as a soft, female teacher. Browsers don't expose a voice's gender, so it's
// inferred from the names of the common female/male voices on Edge, Windows, macOS/iOS and Chrome.
const FEMALE_VOICE =
  /female|neerja|swara|aarohi|aria|jenny|michelle|\bana\b|libby|sonia|maisie|natasha|clara|veena|isha|lekha|kiyara|samantha|allison|\bava\b|susan|victoria|\bzoe\b|karen|moira|tessa|fiona|serena|heera|kalpana|zira|hazel|catherine|joanna|kajal|aditi|raveena|google us english|google हिन्दी/i;
const MALE_VOICE =
  /\bmale\b|prabhat|madhur|manohar|\bguy\b|christopher|\beric\b|ryan|thomas|rishi|\balex\b|daniel|\bfred\b|\btom\b|aaron|arthur|oliver|\bravi\b|hemant|david|\bmark\b|george|james|brian|kunal/i;

// A calm, unhurried pace with a slightly warmer pitch reads like a patient teacher.
const SPEECH_RATE = 0.94;
const SPEECH_PITCH = 1.05;

// Pick the most natural female voice for the language: exact locale (e.g. Indian English) first,
// then neural/"Natural" voices (Edge), premium/enhanced (Apple), Google's; male voices last.
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const want = lang.toLowerCase();
  const base = want.split("-")[0];
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -Infinity;
  for (const voice of voices) {
    const vlang = voice.lang.replace("_", "-").toLowerCase();
    if (!vlang.startsWith(base)) continue;
    const name = voice.name;
    let score = vlang === want ? 100 : 0;
    if (FEMALE_VOICE.test(name)) score += 50;
    else if (MALE_VOICE.test(name)) score -= 80;
    if (/natural|neural/i.test(name)) score += 60;
    if (/premium|enhanced/i.test(name)) score += 45;
    if (/online/i.test(name)) score += 20;
    if (/google/i.test(name)) score += 30;
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

// ---- Playback store (one answer at a time) ------------------------------------------------

let speakingId: string | null = null;
let session = 0;
const listeners = new Set<() => void>();

function setSpeakingId(id: string | null) {
  speakingId = id;
  listeners.forEach((listener) => listener());
}

if (ttsSupported) {
  // Chrome loads voices asynchronously; touching getVoices() early starts that load.
  window.speechSynthesis.getVoices();
}

export function stopSpeaking(): void {
  if (!ttsSupported) return;
  session++;
  window.speechSynthesis.cancel();
  if (speakingId !== null) setSpeakingId(null);
}

/** Speaks an answer (markdown) aloud, replacing whatever was playing. */
export function speakAnswer(id: string, markdown: string, lang: string): void {
  if (!ttsSupported) return;
  stopSpeaking();
  const chunks = chunk(toSpeakableText(markdown));
  if (chunks.length === 0) return;
  const mySession = session;
  const voice = pickVoice(lang);
  chunks.forEach((part, i) => {
    const utterance = new SpeechSynthesisUtterance(part);
    utterance.lang = voice?.lang ?? lang;
    if (voice) utterance.voice = voice;
    utterance.rate = SPEECH_RATE;
    utterance.pitch = SPEECH_PITCH;
    if (i === chunks.length - 1) {
      utterance.onend = () => {
        if (session === mySession) setSpeakingId(null);
      };
    }
    utterance.onerror = () => {
      if (session === mySession) setSpeakingId(null);
    };
    window.speechSynthesis.speak(utterance);
  });
  setSpeakingId(id);
}

/**
 * iOS Safari only lets speech start from a user gesture. Call this inside a tap (send, mic,
 * toggle) so a later automatic read-aloud — after the answer streams in — is allowed.
 */
export function primeSpeech(): void {
  if (!ttsSupported || speakingId !== null) return;
  const silent = new SpeechSynthesisUtterance("");
  silent.volume = 0;
  window.speechSynthesis.speak(silent);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** ID of the answer currently being read aloud, or null. */
export function useSpeakingId(): string | null {
  return useSyncExternalStore(subscribe, () => speakingId);
}
