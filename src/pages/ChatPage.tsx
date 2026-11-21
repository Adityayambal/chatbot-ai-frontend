import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bot } from "lucide-react";
import {
  ApiError,
  closeChat,
  createSession,
  getCatalog,
  getMessages,
  getOutline,
  getSession,
  listChats,
  rateChat,
  requestTeacher,
  sendFeedback,
} from "../api/client";
import { streamChat } from "../api/chatStream";
import ChatHistoryList from "../components/ChatHistoryList";
import ChatInput, { type ChatInputHandle } from "../components/ChatInput";
import ChatRating from "../components/ChatRating";
import ClosePrompt from "../components/ClosePrompt";
import ConfirmDialog from "../components/ConfirmDialog";
import ContextChips from "../components/ContextChips";
import ErrorBanner from "../components/ErrorBanner";
import MessageList from "../components/MessageList";
import ReadOnlyFooter from "../components/ReadOnlyFooter";
import StarterChips from "../components/StarterChips";
import TeacherRequestDialog from "../components/TeacherRequestDialog";
import TopicSidebar from "../components/TopicSidebar";
import { PLAN_ID, SHOW_DEBUG } from "../config";
import { readVoiceReplies, speakAnswer, speechLangFor, stopSpeaking, writeVoiceReplies } from "../speech/readAloud";
import { chatReducer, initialChatState, PENDING_ASSISTANT_ID } from "../state/chatReducer";
import { useSession } from "../state/SessionContext";
import type {
  CatalogOption,
  ChatMessage,
  ChatSummary,
  OutlineResponse,
  SessionContextData,
  SessionDetail,
} from "../types";

interface LocationState {
  context?: SessionContextData;
  starterQuestions?: string[];
}

function lastAssistantId(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].id;
  }
  return null;
}

function isNotOpenError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409 && err.code === "session_not_open";
}

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setSessionId } = useSession();
  const locationState = (location.state as LocationState | null) ?? null;
  // Read inside the session-load effect without making it re-run on every navigation-state change.
  const locationContextRef = useRef(locationState?.context);
  locationContextRef.current = locationState?.context;

  const [context, setContext] = useState<SessionContextData | null>(locationState?.context ?? null);
  const starterQuestions = locationState?.starterQuestions ?? [];
  const [outline, setOutline] = useState<OutlineResponse | null>(null);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  // The assistant message the "Did this solve your doubt?" card sits under. Driven only by the
  // backend's askToClose — never inferred from the answer text.
  const [closePromptFor, setClosePromptFor] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [confirmNewChatOpen, setConfirmNewChatOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [chatsError, setChatsError] = useState(false);
  const historyRequestRef = useRef(0);

  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<ChatInputHandle | null>(null);
  // False until the chat's first question has been answered; that first `done` gives the chat
  // its title, so it's the moment to refresh the history list.
  const hasTitleRef = useRef(true);

  // Voice: answers are read aloud when "Voice replies" is on, or when the doubt was asked by mic.
  const [voiceReplies, setVoiceReplies] = useState(readVoiceReplies);
  const speechLang = speechLangFor(context?.medium ?? "");
  const voiceRepliesRef = useRef(voiceReplies);
  voiceRepliesRef.current = voiceReplies;
  const speechLangRef = useRef(speechLang);
  speechLangRef.current = speechLang;
  const askedByVoiceRef = useRef(false);

  const readOnly = detail !== null && detail.status !== "open";

  const refreshHistory = useCallback(() => {
    const requestId = ++historyRequestRef.current;
    setChatsError(false);
    listChats()
      .then((list) => {
        if (requestId === historyRequestRef.current) setChats(list);
      })
      .catch(() => {
        if (requestId === historyRequestRef.current) setChatsError(true);
      });
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const applySession = useCallback((sessionDetail: SessionDetail, messages: ChatMessage[]) => {
    setDetail(sessionDetail);
    setContext(sessionDetail);
    dispatch({ type: "LOAD", messages });
    hasTitleRef.current = sessionDetail.title !== null;
    setClosePromptFor(
      sessionDetail.status === "open" && sessionDetail.askToClose ? lastAssistantId(messages) : null,
    );
  }, []);

  const reloadSession = useCallback(async () => {
    if (!sessionId) return;
    const [sessionDetail, messages] = await Promise.all([getSession(sessionId), getMessages(sessionId)]);
    applySession(sessionDetail, messages);
  }, [sessionId, applySession]);

  // Resolve/validate the session independently of navigation state, so a hard reload
  // (which loses that state) still resumes correctly. ChatPage stays mounted when moving
  // between chats, so everything tied to the previous chat is reset first.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    abortRef.current?.abort();
    stopSpeaking();
    dispatch({ type: "LOAD", messages: [] });
    setDetail(null);
    setClosePromptFor(null);
    setCloseError(null);
    setRatingOpen(false);
    setTeacherDialogOpen(false);
    setConfirmNewChatOpen(false);
    setStartError(null);
    if (locationContextRef.current) setContext(locationContextRef.current);

    (async () => {
      try {
        const [sessionDetail, messages] = await Promise.all([getSession(sessionId), getMessages(sessionId)]);
        if (cancelled) return;
        applySession(sessionDetail, messages);
        setSessionId(sessionId);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setSessionId(null);
          navigate("/", { replace: true });
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Could not load this session.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, setSessionId, applySession]);

  useEffect(() => stopSpeaking, []);

  const planId = context?.planId;
  const cpId = context?.cpId;
  useEffect(() => {
    if (!planId || !cpId) return;
    let cancelled = false;
    setOutline(null);
    getOutline(planId, cpId)
      .then((o) => {
        if (!cancelled) setOutline(o);
      })
      .catch(() => {
        /* the topic tree is a nice-to-have; a failure here shouldn't block chat */
      });
    return () => {
      cancelled = true;
    };
  }, [planId, cpId]);

  useEffect(() => {
    getCatalog([PLAN_ID])
      .then((data) => setCatalogOptions(data.options))
      .catch(() => {
        /* only needed for "Switch to {subject}" buttons; fine to skip on failure */
      });
  }, []);

  const send = useCallback(
    (text: string, retryOfMessageId?: string) => {
      if (!sessionId) return;
      setClosePromptFor(null);
      setCloseError(null);
      stopSpeaking();
      const readReplyAloud = askedByVoiceRef.current || voiceRepliesRef.current;
      askedByVoiceRef.current = false;
      dispatch(retryOfMessageId ? { type: "RETRY" } : { type: "SEND", text });

      const controller = new AbortController();
      abortRef.current = controller;

      const pending = { text: "", full: "", messageId: "", scheduled: false };
      function flushDelta() {
        pending.scheduled = false;
        if (pending.text) {
          dispatch({ type: "DELTA", messageId: pending.messageId, text: pending.text });
          pending.text = "";
        }
      }

      streamChat(
        { sessionId, message: text, retryOfMessageId: retryOfMessageId ?? null },
        {
          onMeta: (data) => {
            pending.messageId = data.assistantMessageId;
            dispatch({
              type: "META",
              userMessageId: data.userMessageId,
              assistantMessageId: data.assistantMessageId,
            });
          },
          onStatus: (stage) => dispatch({ type: "STATUS", messageId: pending.messageId, stage }),
          onRoute: (data) => dispatch({ type: "ROUTE", messageId: pending.messageId, data }),
          onSources: (sources) => dispatch({ type: "SOURCES", messageId: pending.messageId, sources }),
          onDelta: (text) => {
            pending.text += text;
            pending.full += text;
            if (!pending.scheduled) {
              pending.scheduled = true;
              requestAnimationFrame(flushDelta);
            }
          },
          onDone: (data) => {
            flushDelta();
            dispatch({ type: "DONE", messageId: data.messageId, data });
            setClosePromptFor(data.askToClose ? data.messageId : null);
            if (readReplyAloud && data.status === "complete" && pending.full) {
              speakAnswer(data.messageId, pending.full, speechLangRef.current);
            }
            if (!hasTitleRef.current) {
              hasTitleRef.current = true;
              refreshHistory();
            }
          },
          onError: (error) => {
            flushDelta();
            dispatch({ type: "ERROR", messageId: pending.messageId || PENDING_ASSISTANT_ID, error });
            if (error.code === "session_not_open") {
              // e.g. closed in another tab: reload the chat as it really is (LOAD drops the
              // failed bubble) and fall into read-only mode.
              reloadSession().catch(() => {
                /* the error bubble stays as the fallback */
              });
            }
          },
        },
        controller.signal,
      ).catch(() => {
        /* failures are reported through handlers.onError; nothing else to do here */
      });
    },
    [sessionId, refreshHistory, reloadSession],
  );

  function sendMessage(text: string, viaVoice = false) {
    if (readOnly) return;
    askedByVoiceRef.current = viaVoice;
    send(text);
  }

  function toggleVoiceReplies() {
    setVoiceReplies((on) => {
      writeVoiceReplies(!on);
      return !on;
    });
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleRetry(messageId: string) {
    if (readOnly) return;
    const idx = state.messages.findIndex((m) => m.id === messageId);
    const userMessage = state.messages
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === "user");
    if (!userMessage) return;
    send(userMessage.content, userMessage.id);
  }

  async function handleFeedback(messageId: string, rating: 1 | -1) {
    try {
      await sendFeedback(messageId, rating);
    } catch {
      /* feedback is best-effort */
    }
  }

  async function openSubjectChat(targetPlanId: string, targetCpId: string) {
    // The backend returns the subject's open chat if one exists (resumed), otherwise a new one.
    const session = await createSession(targetPlanId, targetCpId);
    setSessionId(session.sessionId);
    navigate(`/chat/${session.sessionId}`, {
      state: { context: session.context, starterQuestions: session.starterQuestions },
    });
    refreshHistory();
  }

  async function handleSwitchSubject(subjectName: string) {
    const match = catalogOptions.find((o) => o.subjectName === subjectName);
    if (!match) return;
    try {
      await openSubjectChat(match.planId, match.cpId);
    } catch {
      /* best-effort */
    }
  }

  async function handleCloseDoubt() {
    if (!sessionId) return;
    setClosing(true);
    setCloseError(null);
    try {
      const res = await closeChat(sessionId);
      setDetail((d) => d && { ...d, status: res.status, closedAt: res.closedAt ?? d.closedAt, askToClose: false });
      setClosePromptFor(null);
      setRatingOpen(true);
      refreshHistory();
    } catch (err) {
      if (isNotOpenError(err)) {
        await reloadSession().catch(() => {
          /* keep the current view */
        });
        refreshHistory();
      } else {
        setCloseError("Couldn't close this doubt. Please try again.");
      }
    } finally {
      setClosing(false);
    }
  }

  function handleKeepAsking() {
    setClosePromptFor(null);
    inputRef.current?.focus();
  }

  async function handleTeacherRequest(note: string) {
    if (!sessionId) return;
    try {
      const res = await requestTeacher(sessionId, note || undefined);
      setDetail(
        (d) =>
          d && {
            ...d,
            status: res.status,
            teacherRequestedAt: res.teacherRequestedAt ?? new Date().toISOString(),
            askToClose: false,
          },
      );
    } catch (err) {
      if (!isNotOpenError(err)) throw err;
      // Already closed (e.g. in another tab): show the chat as it really is.
      await reloadSession().catch(() => {
        /* keep the current view */
      });
    }
    setClosePromptFor(null);
    setTeacherDialogOpen(false);
    refreshHistory();
  }

  async function handleRate(rating: number, comment: string) {
    if (!sessionId) return;
    try {
      await rateChat(sessionId, rating, comment || undefined);
    } catch (err) {
      // Already rated (e.g. from another tab) counts as success.
      if (!(err instanceof ApiError && err.code === "feedback_exists")) throw err;
    }
    setDetail((d) => d && { ...d, rating: d.rating ?? rating });
    refreshHistory();
  }

  function handleNewChat() {
    setSidebarOpen(false);
    if (!context) return;
    if (!readOnly) {
      if (state.messages.length === 0) {
        inputRef.current?.focus();
        return;
      }
      setStartError(null);
      setConfirmNewChatOpen(true);
      return;
    }
    void startFromReadOnly();
  }

  async function startFromReadOnly() {
    if (!context) return;
    setStartingChat(true);
    setStartError(null);
    try {
      await openSubjectChat(context.planId, context.cpId);
    } catch {
      setStartError("Couldn't start a new chat. Please try again.");
    } finally {
      setStartingChat(false);
    }
  }

  async function confirmNewChat() {
    if (!sessionId || !context) return;
    setStartingChat(true);
    setStartError(null);
    try {
      abortRef.current?.abort();
      try {
        await closeChat(sessionId);
      } catch (err) {
        // Already handed to a teacher elsewhere — it isn't open, so a new chat is fine.
        if (!isNotOpenError(err)) throw err;
      }
      await openSubjectChat(context.planId, context.cpId);
    } catch {
      setStartError("Couldn't start a new chat. Please try again.");
    } finally {
      setStartingChat(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ErrorBanner message={loadError} onRetry={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  if (!context || !sessionId) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <span className="brand-mark h-14 w-14 animate-pulse rounded-full" aria-hidden>
          <Bot size={26} />
        </span>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your session…</p>
      </div>
    );
  }

  const hasAnswer = state.messages.some((m) => m.role === "assistant" && m.status !== "streaming" && m.content !== "");
  const showClosePrompt = !readOnly && !state.isStreaming && closePromptFor !== null;

  return (
    <div className="relative isolate h-dvh md:p-4 lg:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block">
        <div className="absolute -left-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-700/20" />
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-300/30 blur-3xl dark:bg-blue-700/15" />
        <div className="absolute -bottom-40 right-1/4 h-[26rem] w-[26rem] rounded-full bg-purple-300/25 blur-3xl dark:bg-purple-800/20" />
      </div>

      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden bg-white md:rounded-3xl md:shadow-2xl md:shadow-indigo-950/10 md:ring-1 md:ring-slate-900/5 dark:bg-slate-900 dark:md:shadow-black/40 dark:md:ring-white/10">
        <ContextChips
          context={context}
          onOpenSidebar={() => setSidebarOpen(true)}
          onTalkToTeacher={detail?.status === "open" && hasAnswer ? () => setTeacherDialogOpen(true) : undefined}
        />
        <div className="flex min-h-0 flex-1">
          <TopicSidebar
            outline={outline}
            onSelectConcept={(text) => {
              setSidebarOpen(false);
              sendMessage(text);
            }}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            disabled={state.isStreaming || readOnly}
            readOnly={readOnly}
            onNewChat={handleNewChat}
            chatsPanel={
              <ChatHistoryList
                chats={chats}
                error={chatsError}
                onRetry={refreshHistory}
                currentSessionId={sessionId}
                currentPlanId={context.planId}
                currentCpId={context.cpId}
                onNavigate={() => setSidebarOpen(false)}
              />
            }
          />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/70 dark:bg-slate-950/40">
            <MessageList
              messages={state.messages}
              subject={context.subject}
              showDebug={SHOW_DEBUG}
              speechLang={speechLang}
              readOnly={readOnly}
              onRetry={handleRetry}
              onFeedback={handleFeedback}
              onSwitchSubject={handleSwitchSubject}
              afterMessage={
                showClosePrompt && closePromptFor
                  ? {
                      id: closePromptFor,
                      node: (
                        <ClosePrompt
                          closing={closing}
                          error={closeError}
                          onYes={handleCloseDoubt}
                          onNo={handleKeepAsking}
                          onTeacher={() => setTeacherDialogOpen(true)}
                        />
                      ),
                    }
                  : null
              }
              footer={
                detail?.status === "closed" && ratingOpen ? (
                  <ChatRating onSubmit={handleRate} onSkip={() => setRatingOpen(false)} />
                ) : null
              }
            />
            {!readOnly && state.messages.length === 0 && (
              <StarterChips questions={starterQuestions} onSelect={sendMessage} />
            )}
            {readOnly && detail && detail.status !== "open" ? (
              <ReadOnlyFooter
                status={detail.status}
                subject={context.subject}
                rating={detail.rating}
                teacherRequestedAt={detail.teacherRequestedAt}
                starting={startingChat}
                error={startError}
                onNewChat={handleNewChat}
                onRate={
                  detail.status === "closed" && detail.rating === null && !ratingOpen
                    ? () => setRatingOpen(true)
                    : undefined
                }
              />
            ) : (
              <ChatInput
                ref={inputRef}
                disabled={false}
                isStreaming={state.isStreaming}
                onSend={sendMessage}
                onStop={handleStop}
                speechLang={speechLang}
                voiceReplies={voiceReplies}
                onToggleVoiceReplies={toggleVoiceReplies}
              />
            )}
          </main>
        </div>
      </div>

      <TeacherRequestDialog
        open={teacherDialogOpen}
        onClose={() => setTeacherDialogOpen(false)}
        onSubmit={handleTeacherRequest}
      />
      <ConfirmDialog
        open={confirmNewChatOpen}
        title="Start a new chat?"
        message="This chat will be closed and saved in your history."
        confirmLabel="Start new chat"
        busy={startingChat}
        error={startError}
        onConfirm={confirmNewChat}
        onCancel={() => setConfirmNewChatOpen(false)}
      />
    </div>
  );
}
