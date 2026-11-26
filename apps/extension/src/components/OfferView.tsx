import type {
  OfferInspection,
  PreparationResult,
} from "../application/preparation";
import { STEP_COSTS, type PreparationStep } from "../domain/offer";
import { Button, Card } from "./ui";

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
  return <Card title="Offre de l'onglet">{body(props)}</Card>;
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
      <p role="status" className="text-sm text-success">
        Candidature préparée
        {result.title ? ` : ${result.title}` : ""}
        {result.company ? ` chez ${result.company}` : ""}. CV et lettre sont
        prêts. {credits(result.creditsSpent)} dépensé
        {result.creditsSpent > 1 ? "s" : ""}
        {result.balanceAfter === null
          ? "."
          : `, solde : ${credits(result.balanceAfter)}.`}
      </p>
    );
  }
  if (!inspection) {
    return (
      <p className="text-sm text-muted-foreground">Lecture de l'onglet…</p>
    );
  }
  if (inspection.kind === "no-access") {
    return (
      <>
        <p className="text-sm">
          Pour lire l'offre affichée, puis remplir les formulaires des
          recruteurs, JobSpark a besoin d'accéder aux pages web. Rien n'est lu
          tant que vous ne cliquez pas sur « Préparer ».
        </p>
        <Button disabled={busy} onClick={onAllow}>
          Autoriser l'accès aux pages
        </Button>
      </>
    );
  }
  if (inspection.kind === "no-page") {
    return (
      <p className="text-sm text-muted-foreground">
        Ouvrez la page d'une offre d'emploi dans cet onglet.
      </p>
    );
  }

  const { page, plan, existing, balance } = inspection;
  const header = (
    <p className="text-sm">
      <strong>{existing?.title ?? page.title}</strong>
      <br />
      <span className="text-muted-foreground">{page.host}</span>
    </p>
  );

  if (plan.alreadySent) {
    return (
      <>
        {header}
        <p className="text-sm text-warning">
          Candidature déjà envoyée pour cette offre : rien à préparer.
        </p>
      </>
    );
  }
  if (plan.steps.length === 0) {
    return (
      <>
        {header}
        <p className="text-sm text-success">
          Candidature prête : CV et lettre déjà générés. « Remplir le formulaire
          » ci-dessous ouvre le formulaire de l'offre et le remplit.
        </p>
      </>
    );
  }

  const short = balance !== null && balance < plan.cost;
  return (
    <>
      {header}
      {existing && (
        <p className="text-sm">
          Candidature déjà créée, on complète ce qui manque.
        </p>
      )}
      <ul className="text-sm">
        {plan.steps.map((step) => (
          <li key={step} className="flex justify-between">
            <span>{STEP_LABELS[step]}</span>
            <span>{credits(STEP_COSTS[step])}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        Coût : <strong>{credits(plan.cost)}</strong>
        {balance !== null && ` (solde : ${credits(balance)})`}
      </p>
      {short ? (
        <p className="text-sm text-destructive">
          Solde insuffisant pour préparer cette candidature.
        </p>
      ) : confirming ? (
        <div className="flex flex-col gap-2 rounded-md border border-input p-3">
          <p className="text-sm">
            Confirmez-vous la dépense de {credits(plan.cost)} ?
          </p>
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
          Préparer la candidature
        </Button>
      )}
    </>
  );
}
