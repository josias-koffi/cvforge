import type { PanelState } from "../domain/connection";
import { Button, Card } from "./ui";

const STATUS_TEXT: Record<PanelState["status"], string> = {
  connected: "Connecté à votre compte JobSpark.",
  disconnected: "Pas encore connecté.",
  revoked: "La connexion a été révoquée ou a expiré. Reconnectez-vous.",
};

export function ConnectionCard({
  busy,
  state,
  onConnect,
  onDisconnect,
}: {
  busy: boolean;
  state: PanelState;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = state.status === "connected";

  return (
    <Card title="Compte JobSpark">
      <p
        className={
          state.status === "revoked" ? "text-sm text-warning" : "text-sm"
        }
      >
        {STATUS_TEXT[state.status]}
      </p>
      {connected && (
        <p className="text-sm">
          Solde :{" "}
          <strong>
            {state.balance === null
              ? "indisponible"
              : `${state.balance} crédits`}
          </strong>
        </p>
      )}
      <p className="text-xs text-muted-foreground">Serveur : {state.apiHost}</p>
      {connected ? (
        <Button variant="secondary" disabled={busy} onClick={onDisconnect}>
          Se déconnecter
        </Button>
      ) : (
        <Button disabled={busy} onClick={onConnect}>
          Se connecter à JobSpark
        </Button>
      )}
    </Card>
  );
}
