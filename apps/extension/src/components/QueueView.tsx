import { useCallback, useEffect, useState } from "react";
import type { Queue } from "../domain/queue";
import { askBackground } from "../messages";
import { QueueProgress } from "./QueueProgress";
import { QueueSetup } from "./QueueSetup";
import { Notice } from "./ui";

const POLL_MS = 2_000;

/** « Plusieurs offres »: the queue's setup, or the queue at work (US-204). */
export function QueueView({ onSpent }: { onSpent: () => void }) {
  const [queue, setQueue] = useState<Queue | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setQueue(await askBackground({ type: "queue-status" }));
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const running = queue?.running === true;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearInterval(timer);
      onSpent(); // the balance in the header, once the run is over
    };
  }, [running, refresh, onSpent]);

  if (error) return <Notice tone="destructive">{error}</Notice>;
  if (queue === undefined) return null;
  return queue ? (
    <QueueProgress queue={queue} onChange={() => void refresh()} />
  ) : (
    <QueueSetup onStarted={() => void refresh()} />
  );
}
