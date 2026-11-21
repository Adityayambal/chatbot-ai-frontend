import { fetchEventSource } from "@microsoft/fetch-event-source";
import { API_BASE_URL } from "../config";
import { getClientId } from "../state/clientId";
import type { DoneEventData, ErrorEventData, RouteEventData, Source, Stage } from "../types";

export interface ChatStreamRequest {
  sessionId: string;
  message: string;
  retryOfMessageId?: string | null;
}

export interface ChatStreamHandlers {
  onMeta?: (data: { userMessageId: string; assistantMessageId: string }) => void;
  onStatus?: (stage: Stage) => void;
  onRoute?: (data: RouteEventData) => void;
  onSources?: (sources: Source[]) => void;
  onDelta?: (text: string) => void;
  onDone?: (data: DoneEventData) => void;
  onError?: (error: ErrorEventData) => void;
}

/** Thrown from onopen so onerror can tell "already reported" errors apart from
 * genuine connection drops, without reporting the same failure twice. */
class StreamOpenError extends Error {}

export function streamChat(
  req: ChatStreamRequest,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  return fetchEventSource(`${API_BASE_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Client-Id": getClientId() },
    body: JSON.stringify(req),
    signal,
    // Without this, the library closes the stream when the tab is hidden and
    // re-POSTs when it becomes visible again, duplicating the question.
    openWhenHidden: true,
    async onopen(response) {
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("text/event-stream")) {
        let message = `Request failed with status ${response.status}`;
        let code: ErrorEventData["code"] = "network";
        try {
          const body = await response.json();
          code = body?.error?.code ?? code;
          message = body?.error?.message ?? message;
        } catch {
          // non-JSON error body; keep the generic message
        }
        handlers.onError?.({ code, message });
        throw new StreamOpenError(message);
      }
    },
    onmessage(ev) {
      const data = ev.data ? JSON.parse(ev.data) : null;
      switch (ev.event) {
        case "meta":
          handlers.onMeta?.(data);
          break;
        case "status":
          handlers.onStatus?.(data.stage);
          break;
        case "route":
          handlers.onRoute?.(data);
          break;
        case "sources":
          handlers.onSources?.(data);
          break;
        case "delta":
          handlers.onDelta?.(data.text);
          break;
        case "done":
          handlers.onDone?.(data);
          break;
        case "error":
          handlers.onError?.(data);
          break;
        default:
          break;
      }
    },
    onerror(err) {
      if (!(err instanceof StreamOpenError)) {
        handlers.onError?.({ code: "network", message: "Connection lost. Please retry." });
      }
      // Re-throwing stops fetch-event-source's automatic retry — a POST must never be
      // retried automatically; the student retries explicitly via retryOfMessageId.
      throw err;
    },
  });
}
