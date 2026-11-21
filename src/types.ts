export type Verdict = "related" | "not_related" | "greeting" | "unclear" | "unsafe";
export type Stage = "checking" | "searching" | "writing";

export interface CatalogOption {
  cpId: string;
  cpName: string;
  planId: string;
  mediumId: string;
  mediumName: string;
  gradeId: string;
  gradeName: string;
  boardId: string;
  boardName: string;
  subjectId: string;
  subjectName: string;
  chapterCount: number;
  conceptCount: number;
  isActive: boolean;
}

export interface Source {
  id: string;
  type: "revision_note" | "video_transcript" | "question" | "pdf";
  title: string;
  chapter: string;
  concept: string;
  subconcept: string;
  snippet: string;
  videoUrl?: string | null;
  durationSec?: number | null;
  difficulty?: number | null;
  images: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "complete" | "interrupted" | "error";
  createdAt?: string;
  stage?: Stage;
  verdict?: Verdict;
  suggestedSubject?: string | null;
  sources?: Source[];
  error?: { code: string; message: string };
  debug?: {
    reason?: string;
    matchedTopics?: unknown[];
    usage?: unknown;
    latencyMs?: unknown;
    costUsd?: number;
  };
}

export interface MatchedTopic {
  code: string;
  chapter: string;
  concept: string;
  subconcept: string;
}

export interface RouteEventData {
  verdict: Verdict;
  reason: string;
  matchedTopics: MatchedTopic[];
  questionType: string;
  suggestedSubject?: string | null;
}

export interface DoneEventData {
  messageId: string;
  verdict: Verdict;
  status: "complete" | "interrupted";
  usage: { router: Record<string, unknown>; tutor: Record<string, unknown> };
  latencyMs: { router: number; retrieval: number; tutor: number; total: number };
  costUsd: number;
  askToClose: boolean;
}

export interface ErrorEventData {
  code:
    | "busy"
    | "ai_unavailable"
    | "network"
    | "bad_request"
    | "rate_limited"
    | "session_not_found"
    | "session_not_open";
  message: string;
  retryAfter?: number;
}

export interface SessionContextData {
  medium: string;
  grade: string;
  board: string;
  subject: string;
  cpId: string;
  planId: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  context: SessionContextData;
  starterQuestions: string[];
  resumed: boolean;
}

export type SessionStatus = "open" | "closed" | "teacher_requested";

export interface ChatSummary {
  sessionId: string;
  planId: string;
  cpId: string;
  medium: string;
  grade: string;
  board: string;
  subject: string;
  title: string; // the first question asked
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  rating: number | null; // 1-5 or null
}

export interface SessionDetail extends SessionContextData {
  sessionId: string;
  status: SessionStatus;
  title: string | null;
  askToClose: boolean; // show the close card under the last answer (resume case)
  rating: number | null;
  closedAt: string | null;
  teacherRequestedAt: string | null;
}

export interface OutlineSubconcept {
  code: string;
  name: string;
}

export interface OutlineConcept {
  code: string;
  name: string;
  subconcepts: OutlineSubconcept[];
}

export interface OutlineChapter {
  code: string;
  name: string;
  counts: { notes: number; videos: number; questions: number };
  concepts: OutlineConcept[];
}

export interface OutlineResponse {
  cpId: string;
  subject: string;
  chapters: OutlineChapter[];
}
