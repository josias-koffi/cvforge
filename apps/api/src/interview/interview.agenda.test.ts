import {
  INTERVIEW_DURATION_CHOICES,
  interviewRecruiterProfiles,
} from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  INTERVIEW_PHASES,
  buildAgenda,
  countExchanges,
  elapsedSince,
  resolveAgendaState,
  type InterviewAgenda,
} from "./interview.agenda";

const WITH_OFFER = { hasContext: true };
const FREE_PRACTICE = { hasContext: false };

/** Where the interview stands after `minutes`, with `exchanges` behind it. */
function at(agenda: InterviewAgenda, minutes: number, exchanges = 0) {
  return resolveAgendaState(agenda, {
    elapsedMs: minutes * 60_000,
    exchanges,
  });
}

describe("buildAgenda", () => {
  it("lays every phase end to end over the chosen duration", () => {
    for (const profile of interviewRecruiterProfiles) {
      for (const duration of INTERVIEW_DURATION_CHOICES) {
        const agenda = buildAgenda(profile, duration, WITH_OFFER);

        expect(agenda.durationMs).toBe(duration * 60_000);
        expect(agenda.slots.map((slot) => slot.phase)).toEqual([
          ...INTERVIEW_PHASES,
        ]);
        expect(agenda.slots[0]!.startMs).toBe(0);
        expect(agenda.slots.at(-1)!.endMs).toBe(agenda.durationMs);

        // Contiguous: no gap a turn could fall into, no overlap.
        for (const [index, slot] of agenda.slots.entries()) {
          if (index === 0) continue;
          expect(slot.startMs).toBe(agenda.slots[index - 1]!.endMs);
        }
      }
    }
  });

  it("still touches every phase on the shortest interview", () => {
    // Raw shares would give the closing thirty-six seconds of a ten-minute
    // interview, which is not a closing.
    const agenda = buildAgenda("technical", 10, WITH_OFFER);

    for (const slot of agenda.slots) {
      expect(slot.endMs - slot.startMs).toBeGreaterThan(30_000);
    }
  });

  it("gives a technical recruiter most of its time on competencies", () => {
    const technical = buildAgenda("technical", 30, WITH_OFFER);
    const standard = buildAgenda("standard", 30, WITH_OFFER);
    const skills = (agenda: InterviewAgenda) => {
      const slot = agenda.slots.find((entry) => entry.phase === "skills")!;
      return slot.endMs - slot.startMs;
    };

    expect(skills(technical)).toBeGreaterThan(skills(standard));
  });

  it("drops company fit in free practice: there is no offer to fit", () => {
    const agenda = buildAgenda("standard", 20, FREE_PRACTICE);

    expect(agenda.slots.map((slot) => slot.phase)).not.toContain("company_fit");
    expect(agenda.slots.at(-1)!.endMs).toBe(agenda.durationMs);
  });

  it("falls back to the standard plan for an unknown profile", () => {
    const agenda = buildAgenda(
      "chaotic" as never,
      20,
      WITH_OFFER,
    );

    expect(agenda.slots.map((slot) => slot.phase)).toEqual([
      ...INTERVIEW_PHASES,
    ]);
  });

  it("asks for at least one exchange per phase", () => {
    for (const slot of buildAgenda("standard", 10, WITH_OFFER).slots) {
      expect(slot.minExchanges).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("resolveAgendaState", () => {
  const agenda = buildAgenda("standard", 20, WITH_OFFER);

  it("opens on the welcome", () => {
    expect(at(agenda, 0).current).toBe("warmup");
  });

  it("moves through the interview as the clock runs", () => {
    // The whole point: the recruiter used to stay on the first topic forever.
    const phases = [0, 4, 8, 12, 16, 19].map((minute) => at(agenda, minute).current);

    expect(new Set(phases).size).toBeGreaterThanOrEqual(4);
    expect(phases[0]).toBe("warmup");
    expect(phases.at(-1)).toBe("closing");
  });

  it("names the phase that comes next, so the model can hand over", () => {
    const state = at(agenda, 0);

    expect(state.next).toBe("background");
    expect(at(agenda, 19.9).next).toBeNull();
  });

  it("pushes a terse candidate along rather than waiting on the clock", () => {
    // Twenty answers in the first minute: the conversation has outrun time.
    const early = at(agenda, 1, 20);

    expect(early.current).not.toBe("warmup");
  });

  it("never goes backwards, whichever signal is ahead", () => {
    const byClock = at(agenda, 12, 0);
    const byBoth = at(agenda, 12, 30);
    const order = INTERVIEW_PHASES.indexOf.bind(INTERVIEW_PHASES);

    expect(order(byBoth.current)).toBeGreaterThanOrEqual(order(byClock.current));
  });

  it("asks for a wrap-up in the last minute", () => {
    expect(at(agenda, 18).shouldWrapUp).toBe(false);
    expect(at(agenda, 19.5).shouldWrapUp).toBe(true);
  });

  it("stays on the closing once the time is up rather than falling off", () => {
    const over = at(agenda, 45);

    expect(over.current).toBe("closing");
    expect(over.isOvertime).toBe(true);
    expect(over.remainingMs).toBe(0);
  });

  it("reports the time left on the phase, not just on the interview", () => {
    const state = at(agenda, 0);

    expect(state.remainingInPhaseMs).toBeGreaterThan(0);
    expect(state.remainingInPhaseMs).toBeLessThan(state.remainingMs);
  });

  it("treats a negative clock as the start rather than as overtime", () => {
    expect(resolveAgendaState(agenda, { elapsedMs: -5000, exchanges: 0 })).toMatchObject(
      { current: "warmup", elapsedMs: 0 },
    );
  });
});

describe("countExchanges", () => {
  it("counts what the candidate said, not what the recruiter asked", () => {
    expect(
      countExchanges([
        { role: "assistant" },
        { role: "user" },
        { role: "assistant" },
        { role: "user" },
      ]),
    ).toBe(2);
  });

  it("is zero on a fresh session", () => {
    expect(countExchanges([])).toBe(0);
  });
});

describe("elapsedSince", () => {
  it("is zero before anyone has spoken", () => {
    // Credits are spent at creation; the interview starts at the first word.
    expect(elapsedSince(null)).toBe(0);
  });

  it("measures from the first turn", () => {
    const started = "2026-09-21T10:00:00.000Z";
    const now = Date.parse("2026-09-21T10:05:00.000Z");

    expect(elapsedSince(started, now)).toBe(300_000);
  });

  it("ignores an unparsable timestamp rather than throwing mid-interview", () => {
    expect(elapsedSince("not a date")).toBe(0);
  });

  it("never goes negative when clocks disagree", () => {
    const started = "2026-09-21T10:05:00.000Z";
    const now = Date.parse("2026-09-21T10:00:00.000Z");

    expect(elapsedSince(started, now)).toBe(0);
  });
});
