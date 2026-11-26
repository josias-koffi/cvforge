import { useCallback, useEffect, useState } from "react";
import type { Review, SendOutcome } from "../application/sending";
import { askBackground } from "../messages";
import { ReviewView } from "./ReviewView";

/** Loads the review of the filled form and sends it on the candidate's go. */
export function ReviewCard() {
  const [review, setReview] = useState<Review | null>(null);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<void>) => {
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

  const refresh = useCallback(
    () => run(async () => setReview(await askBackground({ type: "review" }))),
    [run],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!review || review.kind !== "review") {
    return error ? (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    ) : null;
  }

  const send = () =>
    run(async () =>
      setOutcome(
        await askBackground({
          applicationId: review.application.id,
          type: "send",
          url: review.url,
        }),
      ),
    );

  return (
    <>
      <ReviewView
        busy={busy}
        outcome={outcome}
        review={review}
        onRefresh={() => void refresh()}
        onSend={() => void send()}
      />
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
