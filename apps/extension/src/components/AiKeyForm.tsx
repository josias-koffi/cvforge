import { useState, type FormEvent } from "react";
import type { AiKeySettings } from "../application/session";
import { DEFAULT_AI_BASE_URL, type PanelState } from "../domain/connection";
import { Button, Field } from "./ui";

/**
 * The candidate's own OpenAI-compatible key (ADR-034 §8). Once saved, the
 * panel only ever sees a masked hint: the key stays in the service worker.
 */
export function AiKeyForm({
  busy,
  aiKey,
  onSave,
  onClear,
}: {
  busy: boolean;
  aiKey: PanelState["aiKey"];
  onSave: (settings: AiKeySettings) => void;
  onClear: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(aiKey.model);
  const [baseURL, setBaseURL] = useState(DEFAULT_AI_BASE_URL);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ apiKey, baseURL, model });
    setApiKey("");
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      {aiKey.configured && (
        <p>
          Clé enregistrée : <code>{aiKey.hint}</code> ({aiKey.model})
        </p>
      )}
      <Field
        id="ai-key"
        label={aiKey.configured ? "Remplacer la clé" : "Clé API"}
        type="password"
        autoComplete="off"
        required
        value={apiKey}
        onChange={setApiKey}
      />
      <Field id="ai-model" label="Modèle" value={model} onChange={setModel} />
      <Field
        id="ai-base-url"
        label="Adresse du fournisseur (compatible OpenAI)"
        type="url"
        value={baseURL}
        onChange={setBaseURL}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !apiKey.trim()}>
          Enregistrer
        </Button>
        {aiKey.configured && (
          <Button variant="secondary" disabled={busy} onClick={onClear}>
            Supprimer la clé
          </Button>
        )}
      </div>
    </form>
  );
}
