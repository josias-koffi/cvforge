import { useCallback, useEffect, useState } from "react";
import { AiKeyForm } from "../../components/AiKeyForm";
import { ConnectionCard } from "../../components/ConnectionCard";
import type { PanelState } from "../../domain/connection";
import { askBackground, type PanelRequest } from "../../messages";

/** Side panel: connection to JobSpark, balance and the candidate's AI key (US-195). */
export function App() {
  const [state, setState] = useState<PanelState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (request: PanelRequest) => {
    setBusy(true);
    setError(null);
    try {
      setState(await askBackground(request));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run({ type: "state" });
  }, [run]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-full bg-spark" />
        <h1 className="text-lg font-semibold">JobSpark</h1>
      </header>

      <p role="status" aria-live="polite" className="sr-only">
        {busy ? "Chargement…" : ""}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {state ? (
        <>
          <ConnectionCard
            busy={busy}
            state={state}
            onConnect={() => run({ type: "connect" })}
            onDisconnect={() => run({ type: "disconnect" })}
          />
          <AiKeyForm
            busy={busy}
            aiKey={state.aiKey}
            onSave={(settings) => run({ settings, type: "save-ai-key" })}
            onClear={() => run({ type: "clear-ai-key" })}
          />
        </>
      ) : (
        !error && <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
    </main>
  );
}
