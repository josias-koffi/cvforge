import type { Review, SendOutcome } from "../application/sending";
import { Button } from "./ui";

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
      <p role="status" className="text-sm text-success">
        Candidature envoyée : le recruteur l'a confirmée. La preuve (page et
        capture) est enregistrée dans JobSpark.
      </p>
    ) : (
      <p role="status" className="text-sm text-warning">
        Envoi à vérifier : aucune page de confirmation n'est apparue. La capture
        est enregistrée dans JobSpark ; vérifiez sur le site du recruteur ou
        dans vos e-mails.
      </p>
    );
  }

  const offer = [review.application.title, review.application.company]
    .filter(Boolean)
    .join(" — ");
  return (
    <section
      aria-labelledby="review-title"
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <h3 id="review-title" className="text-sm font-semibold">
        Récapitulatif avant l'envoi
      </h3>
      <dl className="grid gap-1 text-sm">
        <div>
          <dt className="inline font-medium">Offre : </dt>
          <dd className="inline">{offer || "—"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Documents joints : </dt>
          <dd className="inline">{review.documents.join(", ")}</dd>
        </div>
      </dl>
      <div>
        <p className="text-sm font-medium">
          Champs remplis ({review.fields.length})
        </p>
        <dl className="mt-1 grid max-h-64 gap-1 overflow-y-auto text-sm">
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
      </div>
      {review.requiredEmpty.length > 0 && (
        <p className="text-sm text-destructive">
          Obligatoires et vides : {review.requiredEmpty.join(", ")}
        </p>
      )}
      {review.refusal ? (
        <p role="alert" className="text-sm text-warning">
          {review.refusal}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          « Valider et envoyer » clique sur « {review.submitLabel} » à votre
          place, puis garde la page de confirmation comme preuve.
        </p>
      )}
      <div className="flex gap-2">
        <Button disabled={busy || review.refusal !== null} onClick={onSend}>
          {busy ? "Envoi…" : "Valider et envoyer"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onRefresh}>
          Relire la page
        </Button>
      </div>
    </section>
  );
}
