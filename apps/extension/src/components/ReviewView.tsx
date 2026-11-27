import type { Review, SendOutcome } from "../application/sending";
import { RefreshCwIcon, SendIcon } from "lucide-react";
import { Button, Hint, Notice } from "./ui";

type Props = {
  review: Extract<Review, { kind: "review" }>;
  outcome: SendOutcome | null;
  busy: boolean;
  onRefresh: () => void;
  onSend: () => void;
};

/**
 * What will be sent, before anything is (US-198, ADR-034 §6 level 1): the
 * offer, the documents, every field as the page holds it now.
 */
export function ReviewView({
  review,
  outcome,
  busy,
  onRefresh,
  onSend,
}: Props) {
  if (outcome) {
    return outcome.confirmed ? (
      <Notice tone="success" role="status">
        Candidature envoyée : le recruteur l'a confirmée. La preuve (page et
        capture) est enregistrée dans JobSpark.
      </Notice>
    ) : (
      <Notice tone="warning" role="status">
        Envoi à vérifier : aucune page de confirmation n'est apparue. La capture
        est enregistrée dans JobSpark ; vérifiez sur le site du recruteur ou
        dans vos e-mails.
      </Notice>
    );
  }

  const offer = [review.application.title, review.application.company]
    .filter(Boolean)
    .join(" — ");
  return (
    <section
      aria-labelledby="review-title"
      className="flex flex-col gap-3 border-t pt-3"
    >
      <h3 id="review-title" className="flex items-center gap-2 font-semibold">
        <span
          aria-hidden="true"
          className="flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary"
        >
          3
        </span>
        Récapitulatif avant l'envoi
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Offre</dt>
        <dd className="min-w-0 truncate">{offer || "—"}</dd>
        <dt className="text-muted-foreground">Documents</dt>
        <dd className="min-w-0 break-words">{review.documents.join(", ")}</dd>
      </dl>
      <details className="rounded-lg border">
        <summary className="cursor-pointer px-3 py-2 font-medium">
          Champs remplis ({review.fields.length})
        </summary>
        <dl className="grid max-h-64 gap-1.5 overflow-y-auto border-t px-3 py-2">
          {review.fields.map((field, index) => (
            <div
              key={`${field.label}-${index}`}
              className="grid grid-cols-[40%_1fr] gap-2"
            >
              <dt className="text-muted-foreground">{field.label}</dt>
              <dd className="break-words">{field.value}</dd>
            </div>
          ))}
        </dl>
      </details>
      {review.requiredEmpty.length > 0 && (
        <Notice tone="destructive" role="status">
          Obligatoires et vides : {review.requiredEmpty.join(", ")}
        </Notice>
      )}
      {review.refusal && (
        <Notice tone="warning" role="alert">
          {review.refusal}
        </Notice>
      )}
      <div className="flex gap-2">
        <Button
          variant="spark"
          className="flex-1"
          disabled={busy || review.refusal !== null}
          onClick={onSend}
        >
          <SendIcon aria-hidden="true" />
          {busy ? "Envoi…" : "Valider et envoyer"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onRefresh}>
          <RefreshCwIcon aria-hidden="true" />
          Relire la page
        </Button>
      </div>
      {!review.refusal && (
        <Hint>
          Clique sur « {review.submitLabel} » à votre place, puis garde la page
          de confirmation comme preuve.
        </Hint>
      )}
    </section>
  );
}
