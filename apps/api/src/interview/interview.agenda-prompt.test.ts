import { describe, expect, it } from "vitest";
import { buildAgenda, resolveAgendaState } from "./interview.agenda";
import { buildAgendaDirective } from "./interview.agenda-prompt";

const agenda = buildAgenda("standard", 20, { hasContext: true });

function directiveAt(minutes: number, language: "en" | "fr" = "fr") {
  return buildAgendaDirective(
    resolveAgendaState(agenda, { elapsedMs: minutes * 60_000, exchanges: 0 }),
    language,
  );
}

describe("buildAgendaDirective", () => {
  it("names the phase, its goal and the phase after it", () => {
    const directive = directiveAt(0);

    expect(directive).toContain("accueil");
    expect(directive).toContain("presenter");
    expect(directive).toContain("parcours");
  });

  it("stays the same text for the whole phase, so the prompt cache holds", () => {
    // A clock in here changed the call's instructions after every reply.
    expect(directiveAt(0.5)).toBe(directiveAt(1.5));
  });

  it("caps the self-presentation, which otherwise eats the interview", () => {
    expect(directiveAt(0)).toContain("deux ou trois minutes");
  });

  it("asks for salary expectations by name, in the practical phase", () => {
    // It never came up at all before: there was no phase to raise it in.
    const practical = buildAgendaDirective(
      { ...resolveAgendaState(agenda, { elapsedMs: 0, exchanges: 0 }), current: "expectations", next: "candidate_questions", shouldWrapUp: false },
      "fr",
    );

    expect(practical).toContain("pretentions salariales");
  });

  it("stops asking questions once it is time to close", () => {
    const closing = directiveAt(19.8);

    expect(closing).toContain("Ne pose pas de nouvelle question");
    expect(closing).toContain("prochaines etapes");
  });

  it("forbids reciting the plan out loud", () => {
    // A candidate hearing "we are now in the competencies phase" is talking
    // to a form, not to a recruiter.
    expect(directiveAt(5)).toContain("Ne recapitule jamais le plan");
  });

  it("speaks the interview's language", () => {
    expect(directiveAt(0, "en")).toContain("Current phase: welcome");
    expect(directiveAt(19.8, "en")).toContain("Do not ask another question");
  });

  it("asks for STAR in the competencies phase", () => {
    const skills = buildAgendaDirective(
      { ...resolveAgendaState(agenda, { elapsedMs: 0, exchanges: 0 }), current: "skills", next: "company_fit", shouldWrapUp: false },
      "fr",
    );

    expect(skills).toContain("STAR");
  });

  it("copes with the last phase having nothing after it", () => {
    const last = buildAgendaDirective(
      { ...resolveAgendaState(agenda, { elapsedMs: 0, exchanges: 0 }), current: "candidate_questions", next: null, shouldWrapUp: false },
      "fr",
    );

    expect(last).toContain("Reste sur cette phase");
    expect(last).not.toContain("enchaine sur");
  });
});
