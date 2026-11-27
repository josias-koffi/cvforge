import { LoaderCircleIcon, WandSparklesIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { FillOptions, FillOutcome } from "../application/filling";
import { askBackground } from "../messages";
import { IdentityGaps } from "./IdentityGaps";
import { ReviewCard } from "./ReviewCard";
import type { IdentityField } from "../domain/fill";
import { Button, Card, Hint, Notice, Select } from "./ui";

const label = (application: { title: string | null; company: string | null }) =>
  [application.title ?? "Candidature", application.company]
    .filter(Boolean)
    .join(" — ");

/**
 * « Remplir ce formulaire » (US-197): the candidate picks the prepared
 * application; the agent fills the page and stops before the final button.
 */
export function FillCard() {
  const [options, setOptions] = useState<FillOptions | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [outcome, setOutcome] = useState<FillOutcome | null>(null);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<
    Partial<Record<IdentityField, string>>
  >({});

  const load = useCallback(async () => {
    try {
      const next = await askBackground({ type: "fill-options" });
      setOptions(next);
      setSelected(
        next.kind === "page"
          ? (next.suggestedId ?? next.applications[0]?.id ?? "")
          : "",
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);

  useEffect(() => {
    void load();
    const reload = () => void load();
    const onUpdated = (_id: number, change: { status?: string }) => {
      if (change.status === "complete") reload();
    };
    browser.tabs.onActivated.addListener(reload);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(reload);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [load]);

  if (!options || options.kind !== "page") {
    return error ? (
      <Notice tone="destructive">Remplissage indisponible : {error}</Notice>
    ) : null;
  }

  const fill = async (completeOptional = false) => {
    setFilling(true);
    setError(null);
    setOutcome(null);
    try {
      setOutcome(
        await askBackground({
          applicationId: selected,
          ...(completeOptional && { completeOptional }),
          identity,
          type: "fill",
          url: options.url,
        }),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setFilling(false);
    }
  };

  const single = options.applications.length === 1;
  const short = options.balance !== null && options.balance < options.fillCost;
  const cost = options.personalKey
    ? "Avec votre clé IA personnelle : aucun crédit dépensé."
    : `Gratuit quand vos données suffisent, ${options.fillCost} crédits si l'IA doit compléter des questions.`;

  return (
    <Card step={2} title="Le formulaire">
      {options.applications.length === 0 ? (
        <p className="text-muted-foreground">
          Préparez d'abord une candidature (CV et lettre) depuis la page de
          l'offre.
        </p>
      ) : short ? (
        <Notice tone="destructive">
          Solde insuffisant : le remplissage peut coûter {options.fillCost}{" "}
          crédits (solde : {options.balance}).
        </Notice>
      ) : (
        <>
          {single ? (
            <p className="truncate font-medium">
              {label(options.applications[0]!)}
            </p>
          ) : (
            <Select
              id="fill-application"
              label="Candidature à utiliser"
              value={selected}
              onChange={setSelected}
            >
              {options.applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {label(application)}
                </option>
              ))}
            </Select>
          )}
          {!outcome && (
            <p className="text-muted-foreground">
              Sur {options.host}, l'agent remplit les champs et joint votre CV
              et votre lettre. Il n'envoie rien.
            </p>
          )}
          <IdentityGaps
            gaps={options.profileGaps}
            values={identity}
            onChange={setIdentity}
          />
          <div className="flex flex-col gap-1.5">
            <Button
              variant={outcome ? "secondary" : "primary"}
              disabled={filling || !selected}
              onClick={() => void fill()}
            >
              {filling ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              ) : (
                <WandSparklesIcon aria-hidden="true" />
              )}
              {filling
                ? "Remplissage en cours…"
                : outcome
                  ? "Remplir à nouveau"
                  : options.personalKey
                    ? "Remplir ce formulaire"
                    : `Remplir ce formulaire (${options.fillCost} crédits max)`}
            </Button>
            {!outcome && <Hint>{cost}</Hint>}
          </div>
        </>
      )}
      {outcome && (
        <Outcome
          outcome={outcome}
          filling={filling}
          optionalLabel={
            options.personalKey
              ? "Les compléter avec l'IA"
              : `Les compléter avec l'IA (${options.fillCost} crédits)`
          }
          onCompleteOptional={() => void fill(true)}
        />
      )}
      {error && <Notice tone="destructive">{error}</Notice>}
    </Card>
  );
}

function Outcome({
  outcome,
  filling,
  optionalLabel,
  onCompleteOptional,
}: {
  outcome: FillOutcome;
  filling: boolean;
  optionalLabel: string;
  onCompleteOptional: () => void;
}) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <Notice tone={outcome.success ? "success" : "warning"}>
        <p className="font-medium">
          {outcome.success
            ? "Formulaire rempli. Vérifiez le récapitulatif avant l'envoi."
            : "Formulaire rempli en partie : complétez-le sur la page, puis vérifiez le récapitulatif."}
        </p>
        <p className="text-foreground/80">
          {outcome.prefilled.length} champ(s) rempli(s) sans IA
          {outcome.aiUsed
            ? `, le reste par l'IA (${outcome.creditsSpent} crédit(s)).`
            : " : aucun crédit dépensé."}
          {outcome.questionsAsked > 0 &&
            ` ${outcome.questionsAsked} question(s) posée(s), ${outcome.answersSaved} réponse(s) gardée(s).`}
        </p>
        {outcome.formUrl && (
          <p className="text-foreground/80">
            Formulaire ouvert depuis la page de l'offre :{" "}
            {new URL(outcome.formUrl).host}
          </p>
        )}
      </Notice>
      {outcome.aiUsed && outcome.summary && (
        <p className="whitespace-pre-line text-muted-foreground">
          {outcome.summary}
        </p>
      )}
      {!outcome.aiUsed && outcome.optionalEmpty.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
          <p className="text-muted-foreground">
            Champs facultatifs laissés vides :{" "}
            {outcome.optionalEmpty.join(", ")}.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            disabled={filling}
            onClick={onCompleteOptional}
          >
            {optionalLabel}
          </Button>
        </div>
      )}
      <ReviewCard />
    </div>
  );
}
