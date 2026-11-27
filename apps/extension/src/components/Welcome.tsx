import { LogInIcon } from "lucide-react";
import type { PanelState } from "../domain/connection";
import { Button, Hint, Notice } from "./ui";

/** Shown until the extension is linked to a JobSpark account. */
export function Welcome({
  busy,
  state,
  onConnect,
}: {
  busy: boolean;
  state: PanelState;
  onConnect: () => void;
}) {
  return (
    <section className="rise-in flex flex-col gap-4 rounded-xl border bg-card p-5 text-sm shadow-surface">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Postulez sans ressaisir</h2>
        <p className="text-muted-foreground">
          Sur la page d'une offre, JobSpark prépare votre CV et votre lettre,
          remplit le formulaire du recruteur et vous laisse valider l'envoi.
        </p>
      </div>
      {state.status === "revoked" && (
        <Notice tone="warning">
          La connexion a été révoquée ou a expiré. Reconnectez-vous.
        </Notice>
      )}
      <Button disabled={busy} onClick={onConnect}>
        <LogInIcon aria-hidden="true" />
        Se connecter à JobSpark
      </Button>
      <Hint>Serveur : {state.apiHost}</Hint>
    </section>
  );
}
