import type { CandidateChannel } from "../application/filling";
import type { PanelEvent } from "../filler-messages";

const ANSWER_TIMEOUT_MS = 5 * 60 * 1000;

type Pending = (reply: { answer: string | null; save: boolean }) => void;

/**
 * Questions from the agent to the candidate, through the side panel. With
 * the panel closed, or no answer within five minutes, the field stays empty.
 */
export class PanelChannel implements CandidateChannel {
  private readonly pending = new Map<string, Pending>();

  constructor(
    private readonly send: (event: PanelEvent) => Promise<unknown> = (event) =>
      browser.runtime.sendMessage(event),
    private readonly timeoutMs = ANSWER_TIMEOUT_MS,
  ) {}

  ask(question: string) {
    const id = crypto.randomUUID();
    return new Promise<{ answer: string | null; save: boolean }>((resolve) => {
      const done: Pending = (reply) => {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(reply);
      };
      const timer = setTimeout(
        () => done({ answer: null, save: false }),
        this.timeoutMs,
      );
      this.pending.set(id, done);
      this.send({ id, question, type: "panel/question" }).catch(() =>
        done({ answer: null, save: false }),
      );
    });
  }

  /** The candidate's reply from the panel; an empty answer counts as none. */
  answer(id: string, answer: string, save: boolean) {
    const trimmed = answer.trim();
    this.pending.get(id)?.({
      answer: trimmed || null,
      save: save && Boolean(trimmed),
    });
  }
}
