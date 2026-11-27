import { EyeIcon, SendIcon, SquareIcon } from "lucide-react";
import { useState } from "react";
import {
  queueReport,
  summarize,
  type Queue,
  type QueueItem,
  type QueueItemState,
  type QueueStep,
} from "../domain/queue";
import { askBackground } from "../messages";
import { Button, Card, Notice } from "./ui";

const STATE: Record<QueueItemState, { label: string; tone: string }> = {
  failed: { label: "Échec", tone: "bg-destructive/10 text-destructive" },
  incomplete: { label: "À compléter", tone: "bg-warning/12 text-warning" },
  ready: { label: "Prête à envoyer", tone: "bg-success/12 text-success" },
  sent: { label: "Envoyée", tone: "bg-success/12 text-success" },
  skipped: { label: "Écartée", tone: "bg-muted text-muted-foreground" },
  "to-check": { label: "Envoi à vérifier", tone: "bg-warning/12 text-warning" },
  waiting: { label: "En attente", tone: "bg-muted text-muted-foreground" },
  working: { label: "En cours", tone: "bg-accent text-primary" },
};

const STEP: Record<QueueStep, string> = {
  fill: "Remplissage du formulaire…",
  open: "Ouverture de l'offre…",
  prepare: "Préparation du CV et de la lettre…",
  review: "Relecture du formulaire…",
};

/** The queue at work, then each filled form waiting for its click (US-204). */
export function QueueProgress({
  queue,
  onChange,
}: {
  queue: Queue;
  onChange: () => void;
}) {
  const counts = summarize(queue);
  const done = queue.items.length - counts.waiting - counts.working;
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<number | null>(null);

  const act = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      onChange();
    }
  };
  const send = (index: number) =>
    act(async () => {
      setSending(index);
      try {
        await askBackground({ index, type: "queue-send" });
      } finally {
        setSending(null);
      }
    });

  const report = queue.running ? null : queueReport(queue);

  return (
    <Card title="Plusieurs offres d'un coup">
      {report && (
        <Notice tone={counts.ready + counts.incomplete ? "success" : "info"}>
          <strong className="block font-semibold">{report.title}</strong>
          {report.message}
        </Notice>
      )}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {done}/{queue.items.length} traitée(s)
            {counts.ready > 0 && ` · ${counts.ready} prête(s)`}
          </span>
          <span>
            {queue.spent}/{queue.budget} crédits
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={queue.items.length}
          aria-valuenow={done}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-spark"
            style={{ width: `${(done / queue.items.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-col divide-y rounded-lg border">
        {queue.items.map((item, index) => (
          <Item
            key={item.offer.key}
            item={item}
            sending={sending === index}
            onShow={() =>
              void act(() => askBackground({ index, type: "queue-show" }))
            }
            onSend={() => void send(index)}
          />
        ))}
      </ul>
      {error && <Notice tone="destructive">{error}</Notice>}
      {queue.running ? (
        <Button
          variant="secondary"
          disabled={queue.stopRequested}
          onClick={() => void act(() => askBackground({ type: "queue-stop" }))}
        >
          <SquareIcon aria-hidden="true" />
          {queue.stopRequested
            ? "Arrêt après l'offre en cours…"
            : "Arrêter la file"}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => void act(() => askBackground({ type: "queue-clear" }))}
        >
          Nouvelle file
        </Button>
      )}
    </Card>
  );
}

function Item({
  item,
  sending,
  onShow,
  onSend,
}: {
  item: QueueItem;
  sending: boolean;
  onShow: () => void;
  onSend: () => void;
}) {
  const state = STATE[item.state];
  const sendable = item.state === "ready" || item.state === "incomplete";
  return (
    <li className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-medium">{item.offer.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.offer.company ?? new URL(item.offer.url).host}
            {item.creditsSpent > 0 && ` · ${item.creditsSpent} crédit(s)`}
            {item.filledCount > 0 && ` · ${item.filledCount} champ(s)`}
            {(item.drafted ?? 0) > 0 &&
              ` · ${item.drafted} réponse(s) à relire`}
          </p>
        </div>
        <span
          className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium ${state.tone}`}
        >
          {state.label}
        </span>
      </div>
      {item.state === "working" && item.step && (
        <p className="text-xs text-primary">{STEP[item.step]}</p>
      )}
      {item.reason && (
        <p className="text-xs text-muted-foreground">{item.reason}</p>
      )}
      {(sendable || (item.tabId !== null && item.state !== "waiting")) && (
        <div className="flex gap-2">
          {sendable && (
            <Button
              variant={item.state === "ready" ? "spark" : "secondary"}
              size="sm"
              disabled={sending}
              onClick={onSend}
            >
              <SendIcon aria-hidden="true" />
              {sending ? "Envoi…" : "Valider et envoyer"}
            </Button>
          )}
          {item.tabId !== null && (
            <Button variant="ghost" size="sm" onClick={onShow}>
              <EyeIcon aria-hidden="true" />
              Voir l'onglet
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
