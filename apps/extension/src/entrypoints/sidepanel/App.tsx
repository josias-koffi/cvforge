import { SettingsIcon, ZapIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FillCard } from "../../components/FillCard";
import { OfferCard } from "../../components/OfferCard";
import { QuestionPrompt } from "../../components/QuestionPrompt";
import { Settings } from "../../components/Settings";
import { Brand, Button, Notice } from "../../components/ui";
import { Welcome } from "../../components/Welcome";
import type { PanelState } from "../../domain/connection";
import { askBackground, type PanelRequest } from "../../messages";

type StateRequest = Extract<
  PanelRequest,
  { type: "state" | "connect" | "disconnect" | "save-ai-key" | "clear-ai-key" }
>;

/** Side panel: a compact header, then the application flow or the settings. */
export function App() {
  const [state, setState] = useState<PanelState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);

  const run = useCallback(async (request: StateRequest) => {
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

  const connected = state?.status === "connected";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-card/85 px-4 backdrop-blur">
        <Brand />
        {connected && (
          <div className="ml-auto flex items-center gap-1">
            <span
              title="Votre solde de crédits"
              className="inline-flex h-6 items-center gap-1 rounded-full bg-spark/20 px-2 text-xs font-medium"
            >
              <ZapIcon className="size-3" aria-hidden="true" />
              {state.balance === null ? "—" : state.balance}
              <span className="sr-only"> crédits</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Réglages"
              aria-pressed={settings}
              onClick={() => setSettings((open) => !open)}
            >
              <SettingsIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-3 p-3">
        <p role="status" aria-live="polite" className="sr-only">
          {busy ? "Chargement…" : ""}
        </p>
        {error && <Notice tone="destructive">{error}</Notice>}

        {!state ? (
          !error && <p className="text-muted-foreground">Chargement…</p>
        ) : !connected ? (
          <Welcome
            busy={busy}
            state={state}
            onConnect={() => run({ type: "connect" })}
          />
        ) : (
          <>
            {settings && (
              <Settings
                busy={busy}
                state={state}
                onBack={() => setSettings(false)}
                onDisconnect={() => {
                  setSettings(false);
                  void run({ type: "disconnect" });
                }}
                onSaveKey={(next) =>
                  run({ settings: next, type: "save-ai-key" })
                }
                onClearKey={() => run({ type: "clear-ai-key" })}
              />
            )}
            {/* Kept mounted behind the settings: a fill in progress survives. */}
            <div hidden={settings} className="flex flex-col gap-3">
              <QuestionPrompt />
              <OfferCard onSpent={() => run({ type: "state" })} />
              <FillCard />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
