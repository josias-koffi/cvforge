import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PanelEvent } from "../filler-messages";
import { askBackground } from "../messages";
import { Button, Card, Field } from "./ui";

type Question = { id: string; question: string };

/**
 * The agent met a question the candidate's data does not answer: it waits
 * here instead of making one up (ADR-034 §5). The candidate may keep the
 * answer for the next forms.
 */
export function QuestionPrompt() {
  const [queue, setQueue] = useState<Question[]>([]);
  const [answer, setAnswer] = useState("");
  const [save, setSave] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = queue[0];

  useEffect(() => {
    const listener = (message: unknown) => {
      const event = message as PanelEvent;
      if (event?.type !== "panel/question") return;
      setQueue((items) => [
        ...items,
        { id: event.id, question: event.question },
      ]);
    };
    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, []);

  useEffect(() => {
    if (current) heading.current?.focus();
  }, [current]);

  if (!current) return null;

  const reply = async (text: string, keep: boolean) => {
    await askBackground({
      answer: text,
      id: current.id,
      save: keep,
      type: "answer-question",
    });
    setQueue((items) => items.slice(1));
    setAnswer("");
    setSave(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void reply(answer, save);
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="question-title"
      aria-describedby="question-text"
    >
      <Card title="Une question du formulaire">
        <h3 id="question-title" ref={heading} tabIndex={-1} className="sr-only">
          Question du formulaire
        </h3>
        <p id="question-text" className="text-sm font-medium">
          {current.question}
        </p>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <Field
            id="question-answer"
            label="Votre réponse"
            value={answer}
            onChange={setAnswer}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={save}
              onChange={(event) => setSave(event.target.checked)}
            />
            Garder cette réponse pour mes prochaines candidatures
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={!answer.trim()}>
              Répondre
            </Button>
            <Button variant="secondary" onClick={() => void reply("", false)}>
              Laisser vide
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
