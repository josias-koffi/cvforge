import { describe, expect, it, vi } from "vitest";
import type { FillAnswers } from "../domain/fill";
import type { ModelRelay } from "./model-relay";
import { draftAnswer, type DraftState } from "./open-answers";

const ANSWERS: FillAnswers = { custom: [], fromProfile: null, known: [] };

function setup(
  options: {
    reply?: string | null;
    status?: number;
    unattended?: boolean;
  } = {},
) {
  const state: DraftState = {
    answersSaved: 0,
    applicationId: "app",
    asked: new Map(),
    data: {
      answers: ANSWERS,
      profile: {
        identity: {
          city: "Lille",
          email: "c@example.com",
          firstName: "Camille",
          lastName: "Test",
          links: [],
          phone: "",
        },
      },
    },
    drafted: [],
    model: "jobspark",
    questionsAsked: 0,
    route: {
      baseURL: "https://api/agent/llm",
      kind: "jobspark",
      sessionId: "s",
    },
    unattended: options.unattended ?? false,
  };
  const call = vi.fn(async () => ({
    body: JSON.stringify({
      choices: [{ message: { content: options.reply ?? "J'aime Acme." } }],
    }),
    status: options.status ?? 200,
  }));
  const tools = {
    call: vi.fn(async (name: string) =>
      name === "get_application"
        ? { offer: { title: "Dev" } }
        : `${name}:texte`,
    ),
  };
  const deps = { models: { call } as unknown as ModelRelay, tools };
  return { call, deps, state, tools };
}

describe("draftAnswer (US-208)", () => {
  it("drafts an open question through the fill's route, once, and keeps it", async () => {
    const f = setup();
    const first = await draftAnswer(
      f.state,
      "Pourquoi nous rejoindre ?",
      f.deps,
    );
    expect(first).toContain("J'aime Acme.");
    expect(f.state.drafted).toEqual([
      { answer: "J'aime Acme.", question: "Pourquoi nous rejoindre ?" },
    ]);
    expect(f.call).toHaveBeenCalledWith(f.state.route, {
      body: expect.stringContaining('"model":"jobspark"'),
      url: "https://api/agent/llm/chat/completions",
    });
    const body = JSON.parse(
      (f.call.mock.calls[0] as unknown as [unknown, { body: string }])[1].body,
    );
    expect(JSON.stringify(body.messages)).toContain("get_cover_letter:texte");

    // The agent asks again: same text, no new model call, sources read once.
    expect(
      await draftAnswer(f.state, "Pourquoi nous rejoindre ?", f.deps),
    ).toBe(first);
    expect(f.call).toHaveBeenCalledTimes(1);
    expect(f.tools.call).toHaveBeenCalledTimes(3);
  });

  it("never drafts a salary or a date: asked, or left empty when nobody is there", async () => {
    const attended = setup();
    expect(
      await draftAnswer(
        attended.state,
        "Prétentions salariales",
        attended.deps,
      ),
    ).toContain("ask_user");
    const queued = setup({ unattended: true });
    expect(
      await draftAnswer(queued.state, "Date de disponibilité", queued.deps),
    ).toContain("laisse ce champ vide");
    expect(attended.call).not.toHaveBeenCalled();
    expect(queued.call).not.toHaveBeenCalled();
  });

  it("answers from the candidate's data first, without the model", async () => {
    const f = setup();
    expect(await draftAnswer(f.state, "Prénom", f.deps)).toContain("Camille");
    expect(f.call).not.toHaveBeenCalled();
    expect(f.state.drafted).toEqual([]);
  });

  it("leaves the field when the sources do not answer, or the model fails", async () => {
    const nothing = setup({ reply: "VIDE", unattended: true });
    expect(
      await draftAnswer(nothing.state, "Parlez-nous d'un projet", nothing.deps),
    ).toContain("Laisse ce champ vide");
    const failing = setup({ status: 429 });
    expect(
      await draftAnswer(failing.state, "Pourquoi ce poste ?", failing.deps),
    ).toContain("ask_user");
    expect(nothing.state.drafted).toEqual([]);
  });
});
