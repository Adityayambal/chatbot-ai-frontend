import { API_BASE_URL } from "../config";
import { getClientId } from "../state/clientId";
import type {
  CatalogOption,
  ChatMessage,
  ChatSummary,
  CreateSessionResponse,
  OutlineResponse,
  SessionDetail,
  SessionStatus,
} from "../types";

/** The backend (SQLite) returns UTC timestamps without an offset; treat those as UTC. */
export function parseServerDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const date = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export class ApiError extends Error {
  code: string;
  status: number;
  retryAfter?: number;

  constructor(code: string, message: string, status: number, retryAfter?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

interface CatalogResponse {
  plans: { planId: string; planName: string }[];
  options: CatalogOption[];
  lastSyncedAt: string | null;
}

export interface SessionStatusResponse {
  sessionId: string;
  status: SessionStatus;
  closedAt?: string | null;
  teacherRequestedAt?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": getClientId(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let code = "unknown";
    let message = `Request failed with status ${response.status}`;
    let retryAfter: number | undefined;
    try {
      const body = await response.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
        retryAfter = body.error.retryAfter;
      }
    } catch {
      // response body wasn't JSON; keep the generic message
    }
    throw new ApiError(code, message, response.status, retryAfter);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function getCatalog(planIds: string[]): Promise<CatalogResponse> {
  return request<CatalogResponse>(`/api/catalog?planIds=${planIds.join(",")}`);
}

export async function getOutline(planId: string, cpId: string): Promise<OutlineResponse> {
  return request<OutlineResponse>(`/api/subjects/${cpId}/outline?planId=${planId}`);
}

export async function createSession(planId: string, cpId: string): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ planId, cpId }),
  });
}

export async function getSession(sessionId: string): Promise<SessionDetail> {
  return request<SessionDetail>(`/api/sessions/${sessionId}`);
}

export async function listChats(): Promise<ChatSummary[]> {
  const data = await request<{ sessions: ChatSummary[] }>("/api/sessions");
  return data.sessions;
}

export async function closeChat(sessionId: string): Promise<SessionStatusResponse> {
  return request<SessionStatusResponse>(`/api/sessions/${sessionId}/close`, { method: "POST" });
}

export async function requestTeacher(sessionId: string, note?: string): Promise<SessionStatusResponse> {
  return request<SessionStatusResponse>(`/api/sessions/${sessionId}/teacher-request`, {
    method: "POST",
    body: JSON.stringify(note ? { note } : {}),
  });
}

export async function rateChat(sessionId: string, rating: number, comment?: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/sessions/${sessionId}/feedback`, {
    method: "POST",
    body: JSON.stringify(comment ? { rating, comment } : { rating }),
  });
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const raw = await request<RawMessage[]>(`/api/sessions/${sessionId}/messages`);
  return raw.map(fromRawMessage);
}

interface RawMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: string;
  verdict?: string | null;
  suggestedSubject?: string | null;
  sources?: ChatMessage["sources"];
  createdAt?: string;
  debug?: ChatMessage["debug"];
}

function fromRawMessage(raw: RawMessage): ChatMessage {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    status: raw.status as ChatMessage["status"],
    verdict: raw.verdict as ChatMessage["verdict"],
    suggestedSubject: raw.suggestedSubject,
    sources: raw.sources ?? [],
    createdAt: raw.createdAt,
    debug: raw.debug ?? undefined,
  };
}

export async function sendFeedback(
  messageId: string,
  rating: 1 | -1,
  comment?: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/messages/${messageId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}
