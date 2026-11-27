import type {
  OfferInspection,
  PreparationResult,
} from "../application/preparation";
import { STEP_COSTS, type PreparationStep } from "../domain/offer";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { Button, Card, Hint, Notice } from "./ui";

const STEP_LABELS: Record<PreparationStep, string> = {
  cv: "CV adapté à l'offre",
  import: "Analyse de l'offre",
  letter: "Lettre de motivation",
};

const credits = (n: number) => `${n} crédit${n > 1 ? "s" : ""}`;

export type OfferViewProps = {
  inspection: OfferInspection | null;
  result: PreparationResult | null;
  confirming: boolean;
  busy: boolean;
  onAllow: () => void;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The offer of the active tab and what preparing it costs (US-196). */
export function OfferView(props: OfferViewProps) {
  return (
    <Card step={1} title="L'offre">
      {body(props)}
    </Card>
  );
}

function body({
  inspection,
  result,
  confirming,
  busy,
  onAllow,
  onAsk,
  onConfirm,
  onCancel,
}: OfferViewProps) {
  if (result) {
    return (
      <Notice tone="success" role="status">
        Candidature préparée
        {result.title ? ` : ${result.title}` : ""}
        {result.company ? ` chez ${result.company}` : ""}. CV et lettre sont
        prêts. {credits(result.creditsSpent)} dépensé
        {result.creditsSpent > 1 ? "s" : ""}
        {result.balanceAfter === null
          ? "."
          : `, solde : ${credits(result.balanceAfter)}.`}
      </Notice>
    );
  }
  if (!inspection) {
    return <p className="text-muted-foreground">Lecture de l'onglet…</p>;
  }
  if (inspection.kind === "no-access") {
    return (
      <>
        <p className="text-muted-foreground">
          Pour lire l'offre affichée et remplir les formulaires des recruteurs,
          JobSpark a besoin d'accéder aux pages web. Rien n'est lu tant que vous
          ne cliquez pas sur « Préparer ».
        </p>
        <Button disabled={busy} onClick={onAllow}>
          Autoriser l'accès aux pages
        </Button>
      </>
    );
  }
  if (inspection.kind === "no-page") {
    return (
      <p className="text-muted-foreground">
        Ouvrez la page d'une offre d'emploi dans cet onglet.
      </p>
    );
  }

  const { page, plan, existing, balance } = inspection;
  const header = (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="line-clamp-2 font-medium">
        {existing?.title ?? page.title}
      </p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ExternalLinkIcon className="size-3" aria-hidden="true" />
        {page.host}
      </p>
    </div>
  );

  if (plan.alreadySent) {
    return (
      <>
        {header}
        <Notice tone="warning">
          Candidature déjà envoyée pour cette offre : rien à préparer.
        </Notice>
      </>
    );
  }
  if (plan.steps.length === 0) {
    return (
      <>
        {header}
        <Notice tone="success">
          CV et lettre déjà générés : passez au formulaire.
        </Notice>
      </>
    );
  }

  const short = balance !== null && balance < plan.cost;
  return (
    <>
      {header}
      {existing && (
        <Hint>Candidature déjà créée : on complète ce qui manque.</Hint>
      )}
      <ul className="divide-y rounded-lg border">
        {plan.steps.map((step) => (
          <li key={step} className="flex justify-between px-3 py-2">
            <span>{STEP_LABELS[step]}</span>
            <span className="text-muted-foreground">
              {credits(STEP_COSTS[step])}
            </span>
          </li>
        ))}
        <li className="flex justify-between bg-muted/60 px-3 py-2 font-medium">
          <span>Total</span>
          <span>{credits(plan.cost)}</span>
        </li>
      </ul>
      {balance !== null && !short && (
        <Hint>Votre solde : {credits(balance)}</Hint>
      )}
      {short ? (
        <Notice tone="destructive">
          Solde insuffisant pour préparer cette candidature (solde :{" "}
          {credits(balance ?? 0)}).
        </Notice>
      ) : confirming ? (
        <div className="flex flex-col gap-2 rounded-lg bg-accent p-3">
          <p>Confirmez-vous la dépense de {credits(plan.cost)} ?</p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={onConfirm}>
              Confirmer
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button disabled={busy} onClick={onAsk}>
          <SparklesIcon aria-hidden="true" />
          Préparer la candidature
        </Button>
      )}
    </>
  );
}
