export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";
export const PLAN_ID: string =
  import.meta.env.VITE_PLAN_ID ?? "6b00418010a08d28bb37e089";
export const SHOW_DEBUG: boolean =
  (import.meta.env.VITE_SHOW_DEBUG ?? "false") === "true";

// Mirrors backend MAX_MESSAGE_CHARS (not a server round-trip; just the input counter/limit).
export const MAX_MESSAGE_CHARS = 1500;
