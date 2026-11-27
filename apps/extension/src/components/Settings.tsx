import { ArrowLeftIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";
import type { AiKeySettings } from "../application/session";
import type { PanelState } from "../domain/connection";
import { AiKeyForm } from "./AiKeyForm";
import { Button, Card, Hint } from "./ui";

/** Account and advanced options, out of the way of the application flow. */
export function Settings({
  busy,
  state,
  onBack,
  onDisconnect,
  onSaveKey,
  onClearKey,
}: {
  busy: boolean;
  state: PanelState;
  onBack: () => void;
  onDisconnect: () => void;
  onSaveKey: (settings: AiKeySettings) => void;
  onClearKey: () => void;
}) {
  return (
    <>
      <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
        <ArrowLeftIcon aria-hidden="true" />
        Retour
      </Button>
      <Card title="Compte">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">État</dt>
          <dd className="text-success">Connecté</dd>
          <dt className="text-muted-foreground">Solde</dt>
          <dd>
            {state.balance === null
              ? "indisponible"
              : `${state.balance} crédits`}
          </dd>
          <dt className="text-muted-foreground">Serveur</dt>
          <dd className="truncate">{state.apiHost}</dd>
        </dl>
        <Button variant="secondary" disabled={busy} onClick={onDisconnect}>
          <LogOutIcon aria-hidden="true" />
          Se déconnecter
        </Button>
      </Card>
      <details
        open={state.aiKey.configured}
        className="group rounded-xl border bg-card text-sm shadow-surface"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold">
          <KeyRoundIcon
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          Clé IA personnelle
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {state.aiKey.configured ? state.aiKey.hint : "Avancé"}
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4">
          <Hint>
            Facultatif. Par défaut, JobSpark remplit les formulaires avec son
            modèle, pour quelques crédits. Avec votre propre clé (compatible
            OpenAI, par exemple OpenRouter), le remplissage ne coûte aucun
            crédit. La clé reste sur cet ordinateur.
          </Hint>
          <AiKeyForm
            busy={busy}
            aiKey={state.aiKey}
            onSave={onSaveKey}
            onClear={onClearKey}
          />
        </div>
      </details>
    </>
  );
}
