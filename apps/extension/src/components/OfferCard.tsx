import { useCallback, useEffect, useState } from "react";
import type {
  OfferInspection,
  PreparationResult,
} from "../application/preparation";
import { WEB_PAGE_ORIGINS } from "../infrastructure/page-reader";
import { askBackground } from "../messages";
import { OfferView } from "./OfferView";

/**
 * Follows the active tab and prepares its offer. Credits are spent only after
 * the candidate confirmed the cost shown for this very page.
 */
export function OfferCard({ onSpent }: { onSpent: () => void }) {
  const [inspection, setInspection] = useState<OfferInspection | null>(null);
  const [result, setResult] = useState<PreparationResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guard = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  }, []);

  const inspect = useCallback(
    () =>
      guard(async () => {
        setResult(null);
        setConfirming(false);
        setInspection(await askBackground({ type: "inspect-offer" }));
      }),
    [guard],
  );

  useEffect(() => {
    void inspect();
    const onActivated = () => void inspect();
    const onUpdated = (_id: number, change: { status?: string }) => {
      if (change.status === "complete") void inspect();
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [inspect]);

  const allow = () =>
    guard(async () => {
      // Must run in the panel: Chrome asks only on a user gesture.
      if (await browser.permissions.request({ origins: WEB_PAGE_ORIGINS })) {
        setInspection(await askBackground({ type: "inspect-offer" }));
      }
    });

  const confirm = () =>
    guard(async () => {
      if (inspection?.kind !== "page") return;
      setConfirming(false);
      setPreparing(true);
      try {
        setResult(
          await askBackground({
            cost: inspection.plan.cost,
            type: "prepare-offer",
            url: inspection.page.url,
          }),
        );
      } finally {
        setPreparing(false);
        onSpent();
      }
    });

  return (
    <>
      <OfferView
        busy={busy}
        confirming={confirming}
        inspection={inspection}
        result={result}
        onAllow={allow}
        onAsk={() => setConfirming(true)}
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
      {preparing && (
        <p role="status" className="text-sm text-muted-foreground">
          Préparation en cours (analyse, CV, lettre) : cela peut prendre une
          minute.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </>
  );
}
