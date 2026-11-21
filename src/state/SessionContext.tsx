import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { PLAN_ID } from "../config";

const LAST_SELECTION_KEY = "ts-doubt-chat:lastSelection";
const SESSION_ID_KEY = "ts-doubt-chat:sessionId";

export interface LastSelection {
  mediumId: string;
  gradeId: string;
  boardId: string;
  cpId: string;
}

interface SessionContextValue {
  planId: string;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  lastSelection: LastSelection | null;
  setLastSelection: (selection: LastSelection | null) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function readLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // private browsing / quota exceeded — persistence is a nice-to-have here
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(() =>
    readLocalStorage<string>(SESSION_ID_KEY),
  );
  const [lastSelection, setLastSelectionState] = useState<LastSelection | null>(() =>
    readLocalStorage<LastSelection>(LAST_SELECTION_KEY),
  );

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id);
    writeLocalStorage(SESSION_ID_KEY, id);
  }, []);

  const setLastSelection = useCallback((selection: LastSelection | null) => {
    setLastSelectionState(selection);
    writeLocalStorage(LAST_SELECTION_KEY, selection);
  }, []);

  return (
    <SessionContext.Provider
      value={{ planId: PLAN_ID, sessionId, setSessionId, lastSelection, setLastSelection }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
