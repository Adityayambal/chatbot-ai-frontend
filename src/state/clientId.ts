// Anonymous per-browser student ID, sent as `X-Client-Id`. It stands in for a real student
// account until login exists, so chat history is per browser.
const CLIENT_ID_KEY = "ts-doubt-chat:clientId";

let cachedId: string | null = null;

function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID only exists in secure contexts (https / localhost); e.g. testing on a phone via
  // http://<lan-ip> needs this RFC 4122 v4 fallback built from getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getClientId(): string {
  if (cachedId) return cachedId;
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // storage unavailable — fall through to an in-memory ID for this page's lifetime
  }
  cachedId = newId();
  try {
    localStorage.setItem(CLIENT_ID_KEY, cachedId);
  } catch {
    // private browsing / quota exceeded — keep the in-memory ID
  }
  return cachedId;
}
