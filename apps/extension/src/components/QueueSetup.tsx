import { PlayIcon, SunriseIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { QueueCandidates } from "../application/queue";
import type { IdentityField } from "../domain/fill";
import { MAX_QUEUE, maxOfferCost, type QueueOffer } from "../domain/queue";
import { WEB_PAGE_ORIGINS } from "../infrastructure/page-reader";
import { askBackground } from "../messages";
import { IdentityGaps } from "./IdentityGaps";
import { Button, Card, Field, Hint, Notice } from "./ui";

/** Choosing the offers and the budget of a queue (US-204). */
export function QueueSetup({ onStarted }: { onStarted: () => void }) {
  const [candidates, setCandidates] = useState<QueueCandidates | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [budget, setBudget] = useState<string>("");
  const [identity, setIdentity] = useState<
    Partial<Record<IdentityField, string>>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await askBackground({ type: "queue-candidates" });
      setCandidates(next);
      if (next.kind === "ready") setPicked(next.suggested);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!candidates) {
    return error ? (
      <Notice tone="destructive">{error}</Notice>
    ) : (
      <p className="text-muted-foreground">Chargement des offres…</p>
    );
  }
  if (candidates.kind === "no-access") {
    return (
      <Card title="Plusieurs offres d'un coup">
        <p className="text-muted-foreground">
          Pour ouvrir et remplir les formulaires des recruteurs, JobSpark a
          besoin d'accéder aux pages web.
        </p>
        <Button
          onClick={() =>
            void browser.permissions
              .request({ origins: WEB_PAGE_ORIGINS })
              .then((granted) => {
                if (granted) void load();
              })
          }
        >
          Autoriser l'accès aux pages
        </Button>
      </Card>
    );
  }

  const perOffer = maxOfferCost(candidates.fillCost);
  const ceiling = picked.length * perOffer;
  const chosenBudget = budget === "" ? ceiling : Number(budget);
  const short =
    candidates.balance !== null && chosenBudget > candidates.balance;
  const toggle = (key: string) =>
    setPicked((keys) =>
      keys.includes(key)
        ? keys.filter((k) => k !== key)
        : keys.length < MAX_QUEUE
          ? [...keys, key]
          : keys,
    );
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const offers = picked
        .map((key) => candidates.offers.find((offer) => offer.key === key))
        .filter((offer): offer is QueueOffer => offer !== undefined);
      await askBackground({
        budget: chosenBudget,
        identity,
        offers,
        type: "queue-start",
      });
      onStarted();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Plusieurs offres d'un coup">
      <p className="text-muted-foreground">
        L'agent prépare et remplit chaque formulaire dans un onglet en
        arrière-plan, sans vous poser de question. Rien n'est envoyé : vous
        validez chaque candidature d'un clic.
      </p>
      {candidates.offers.length === 0 ? (
        <Notice tone="info">
          Aucune offre à proposer : ouvrez les offres qui vous intéressent dans
          des onglets, puis rechargez cette liste.
        </Notice>
      ) : (
        <fieldset className="flex flex-col gap-1">
          {candidates.daily.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="mb-2 self-start"
              onClick={() => setPicked(candidates.daily)}
            >
              <SunriseIcon aria-hidden="true" />
              Offres du jour ({candidates.daily.length})
            </Button>
          )}
          <legend className="mb-1 flex w-full items-center justify-between text-xs font-medium">
            <span>
              Offres ({picked.length}/{MAX_QUEUE})
            </span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => void load()}
            >
              Recharger
            </button>
          </legend>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {candidates.offers.map((offer) => (
              <li key={offer.key}>
                <label className="flex cursor-pointer items-start gap-2 px-3 py-2 hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={picked.includes(offer.key)}
                    disabled={
                      !picked.includes(offer.key) && picked.length >= MAX_QUEUE
                    }
                    onChange={() => toggle(offer.key)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium">
                      {offer.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {offer.daily ? "Du jour · " : ""}
                      {offer.source === "tab" ? "Onglet ouvert · " : ""}
                      {offer.company ?? new URL(offer.url).host}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <IdentityGaps
        gaps={candidates.profileGaps}
        values={identity}
        onChange={setIdentity}
      />
      <Field
        id="queue-budget"
        label="Budget maximum (crédits)"
        type="number"
        value={budget === "" ? String(ceiling) : budget}
        onChange={setBudget}
      />
      <Hint>
        {perOffer} crédits au plus par offre (préparation{" "}
        {perOffer - candidates.fillCost}
        {candidates.fillCost ? `, remplissage ${candidates.fillCost}` : ""}) ;
        moins si le CV et la lettre existent déjà. Les offres sans formulaire
        accessible sont écartées sans rien débiter.
        {candidates.balance !== null &&
          ` Solde : ${candidates.balance} crédits.`}
      </Hint>
      {short && (
        <Notice tone="destructive">Votre solde est sous ce budget.</Notice>
      )}
      <Button
        disabled={busy || picked.length === 0 || short || !(chosenBudget >= 0)}
        onClick={() => void start()}
      >
        <PlayIcon aria-hidden="true" />
        Lancer la file ({picked.length} offre{picked.length > 1 ? "s" : ""})
      </Button>
      {error && <Notice tone="destructive">{error}</Notice>}
    </Card>
  );
}
