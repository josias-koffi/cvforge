import { CheckIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";
import { APPLICATION_STATUS_DRAFT } from "@cvforge/types";
import type { ReadOnlyOptions } from "../application/read-only-apply";
import { askBackground } from "../messages";
import { Button, Card, Hint, Notice } from "./ui";

/**
 * Step 2 on LinkedIn or Indeed (US-210): nothing is filled; the candidate
 * gets the prepared CV and letter, applies, then marks it sent.
 */
export function ReadOnlyCard({
  options,
  onChange,
}: {
  options: ReadOnlyOptions;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { application, documents, site } = options;

  const act = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };
  const open = (kind: "cv" | "letter") =>
    act(async () => {
      const url = await askBackground({
        applicationId: application!.id,
        kind,
        type: "document-link",
      });
      await browser.tabs.create({ url });
    });
  const markSent = () =>
    act(async () => {
      await askBackground({
        applicationId: application!.id,
        type: "mark-sent",
      });
      onChange();
    });

  return (
    <Card step={2} title="La candidature">
      <p className="text-muted-foreground">
        Sur {site}, vous postulez vous-même : JobSpark ne remplit rien et ne
        clique sur rien.
      </p>
      {!application || (!documents.cv && !documents.letter) ? (
        <Hint>Préparez d'abord votre CV et votre lettre à l'étape 1.</Hint>
      ) : application.status !== APPLICATION_STATUS_DRAFT ? (
        <Notice tone="success" role="status">
          Candidature marquée comme envoyée dans JobSpark.
        </Notice>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {documents.cv && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void open("cv")}
              >
                <DownloadIcon aria-hidden="true" />
                CV (PDF)
              </Button>
            )}
            {documents.letter && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void open("letter")}
              >
                <DownloadIcon aria-hidden="true" />
                Lettre (PDF)
              </Button>
            )}
          </div>
          <Hint>
            Joignez-les sur {site}. Une fois la candidature envoyée, indiquez-le
            pour la suivre dans JobSpark.
          </Hint>
          <Button disabled={busy} onClick={() => void markSent()}>
            <CheckIcon aria-hidden="true" />
            Je l'ai envoyée
          </Button>
        </>
      )}
      {error && <Notice tone="destructive">{error}</Notice>}
    </Card>
  );
}
