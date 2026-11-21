import type { ChatMessage, DoneEventData, ErrorEventData, RouteEventData, Source, Stage } from "../types";

export const PENDING_USER_ID = "pending-user";
export const PENDING_ASSISTANT_ID = "pending-assistant";

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export type ChatAction =
  | { type: "SEND"; text: string }
  | { type: "RETRY" }
  | { type: "META"; userMessageId: string; assistantMessageId: string }
  | { type: "STATUS"; messageId: string; stage: Stage }
  | { type: "ROUTE"; messageId: string; data: RouteEventData }
  | { type: "SOURCES"; messageId: string; sources: Source[] }
  | { type: "DELTA"; messageId: string; text: string }
  | { type: "DONE"; messageId: string; data: DoneEventData }
  | { type: "ERROR"; messageId: string; error: ErrorEventData }
  | { type: "LOAD"; messages: ChatMessage[] };

export const initialChatState: ChatState = { messages: [], isStreaming: false };

function mapMessage(state: ChatState, id: string, updater: (m: ChatMessage) => ChatMessage): ChatState {
  return {
    ...state,
    messages: state.messages.map((m) => (m.id === id ? updater(m) : m)),
  };
}

function placeholderAssistant(): ChatMessage {
  return {
    id: PENDING_ASSISTANT_ID,
    role: "assistant",
    content: "",
    status: "streaming",
    createdAt: new Date().toISOString(),
    stage: "checking",
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SEND": {
      const userMessage: ChatMessage = {
        id: PENDING_USER_ID,
        role: "user",
        content: action.text,
        status: "complete",
        createdAt: new Date().toISOString(),
      };
      return {
        messages: [...state.messages, userMessage, placeholderAssistant()],
        isStreaming: true,
      };
    }

    case "RETRY": {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          messages[i] = placeholderAssistant();
          break;
        }
      }
      return { messages, isStreaming: true };
    }

    case "META": {
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (m.id === PENDING_USER_ID) return { ...m, id: action.userMessageId };
          if (m.id === PENDING_ASSISTANT_ID) return { ...m, id: action.assistantMessageId };
          return m;
        }),
      };
    }

    case "STATUS":
      return mapMessage(state, action.messageId, (m) => ({ ...m, stage: action.stage }));

    case "ROUTE":
      return mapMessage(state, action.messageId, (m) => ({
        ...m,
        verdict: action.data.verdict,
        suggestedSubject: action.data.suggestedSubject ?? null,
        debug: { ...m.debug, reason: action.data.reason, matchedTopics: action.data.matchedTopics },
      }));

    case "SOURCES":
      return mapMessage(state, action.messageId, (m) => ({ ...m, sources: action.sources }));

    case "DELTA":
      return mapMessage(state, action.messageId, (m) => ({ ...m, content: m.content + action.text }));

    case "DONE":
      return {
        ...mapMessage(state, action.messageId, (m) => ({
          ...m,
          status: action.data.status,
          debug: { ...m.debug, usage: action.data.usage, latencyMs: action.data.latencyMs, costUsd: action.data.costUsd },
        })),
        isStreaming: false,
      };

    case "ERROR":
      return {
        ...mapMessage(state, action.messageId, (m) => ({ ...m, status: "error", error: action.error })),
        isStreaming: false,
      };

    case "LOAD":
      return { messages: action.messages, isStreaming: false };

    default:
      return state;
  }
}
