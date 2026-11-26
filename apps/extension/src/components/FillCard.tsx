import { useCallback, useEffect, useState } from "react";
import type { FillOptions, FillOutcome } from "../application/filling";
import { askBackground } from "../messages";
import { ReviewCard } from "./ReviewCard";
import type { IdentityField } from "../domain/fill";
import { Button, Card, Field } from "./ui";

const AUTOCOMPLETE: Record<IdentityField, string> = {
  email: "email",
  firstName: "given-name",
  lastName: "family-name",
  linkedin: "url",
  phone: "tel",
};

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
      setSelected(next.kind === "page" ? (next.suggestedId ?? "") : "");
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
      <p
        role="alert"
        className="rounded-md border border-destructive p-3 text-sm text-destructive"
      >
        Remplissage indisponible : {error}
      </p>
    ) : null;
  }

  const fill = async () => {
    setFilling(true);
    setError(null);
    setOutcome(null);
    try {
      setOutcome(
        await askBackground({
          applicationId: selected,
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

  return (
    <Card title="Remplir le formulaire">
      {options.applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Préparez d'abord une candidature (CV et lettre) depuis la page de
          l'offre.
        </p>
      ) : options.balance !== null && options.balance < options.fillCost ? (
        <p className="text-sm text-destructive">
          Solde insuffisant : le remplissage coûte {options.fillCost} crédits
          (solde : {options.balance}).
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="fill-application" className="text-sm font-medium">
              Candidature à utiliser
            </label>
            <select
              id="fill-application"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="rounded-md border border-input bg-card px-3 py-2 text-sm"
            >
              {options.applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {label(application)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Sur {options.host} : l'agent remplit les champs, joint votre CV et
            votre lettre, et vous pose les questions auxquelles vos données ne
            répondent pas. Il n'envoie rien.
          </p>
          {options.profileGaps.length > 0 && (
            <fieldset className="flex flex-col gap-2 rounded-md border border-warning p-3">
              <legend className="px-1 text-sm font-medium">
                Il manque à votre profil
              </legend>
              <p className="text-xs text-muted-foreground">
                Donnez-les une fois ici : l'agent remplira ensuite le formulaire
                sans vous interrompre, et les gardera pour les suivants. Laissez
                vide ce que vous ne voulez pas donner.
              </p>
              {options.profileGaps.map((gap) => (
                <Field
                  key={gap.field}
                  id={`identity-${gap.field}`}
                  label={gap.label}
                  type={
                    gap.field === "email"
                      ? "email"
                      : gap.field === "phone"
                        ? "tel"
                        : gap.field === "linkedin"
                          ? "url"
                          : "text"
                  }
                  autoComplete={AUTOCOMPLETE[gap.field]}
                  value={identity[gap.field] ?? ""}
                  onChange={(value) =>
                    setIdentity((given) => ({ ...given, [gap.field]: value }))
                  }
                />
              ))}
            </fieldset>
          )}
          <p className="text-xs text-muted-foreground">
            {options.personalKey
              ? "Avec votre clé IA personnelle : aucun crédit dépensé."
              : `Coût : ${options.fillCost} crédits${options.balance === null ? "" : ` (solde : ${options.balance})`}.`}
          </p>
          <Button disabled={filling || !selected} onClick={() => void fill()}>
            {filling
              ? "Remplissage en cours…"
              : options.personalKey
                ? "Remplir ce formulaire"
                : `Remplir ce formulaire (${options.fillCost} crédits)`}
          </Button>
        </>
      )}
      {outcome && (
        <div role="status" className="flex flex-col gap-1 text-sm">
          <p className={outcome.success ? "text-success" : "text-warning"}>
            {outcome.success
              ? "Formulaire rempli. Vérifiez le récapitulatif ci-dessous avant l'envoi."
              : "Formulaire rempli en partie : complétez-le sur la page, puis vérifiez le récapitulatif."}
          </p>
          {outcome.formUrl && (
            <p className="text-muted-foreground">
              Formulaire ouvert depuis la page de l'offre :{" "}
              {new URL(outcome.formUrl).host}
            </p>
          )}
          <p className="whitespace-pre-line text-muted-foreground">
            {outcome.summary}
          </p>
          {outcome.questionsAsked > 0 && (
            <p className="text-muted-foreground">
              {outcome.questionsAsked} question(s) posée(s),{" "}
              {outcome.answersSaved} réponse(s) gardée(s).
            </p>
          )}
          <ReviewCard />
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </Card>
  );
}
