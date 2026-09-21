import {
  INTERVIEW_PROFILE_AGGRESSIVE,
  INTERVIEW_PROFILE_BEHAVIORAL,
  INTERVIEW_PROFILE_PASSIVE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_PROFILE_TECHNICAL,
  type InterviewRecruiterProfile,
} from "@cvforge/types";

/**
 * The plan a real recruiter works from, as arithmetic.
 *
 * The interviewer used to be told to "pose exactement une question de relance"
 * — literally, always follow up on what was just said — so it dug into the
 * first topic for the whole interview and never asked about anything else. It
 * had no notion of ground to cover or of time passing.
 *
 * The phases follow the structured-interview sequence recruiters are trained
 * on: welcome, career history, motivation, competencies, the company and the
 * role, practical matters, the candidate's own questions, closing.
 *
 * Computed here rather than left to the model: a speech model has no reliable
 * sense of elapsed time and cannot schedule itself, and a plan carried in
 * prose costs tokens on every turn and drifts. A pure function of
 * (elapsed, exchanges, profile, duration) is also the only version that can be
 * tested.
 */
export const INTERVIEW_PHASES = [
  "warmup",
  "background",
  "motivation",
  "skills",
  "company_fit",
  "expectations",
  "candidate_questions",
  "closing",
] as const;

export type InterviewPhase = (typeof INTERVIEW_PHASES)[number];

export interface AgendaSlot {
  phase: InterviewPhase;
  startMs: number;
  endMs: number;
  /** Below this, the clock alone should not push the interview onwards. */
  minExchanges: number;
}

export interface InterviewAgenda {
  durationMs: number;
  slots: AgendaSlot[];
}

export interface AgendaState {
  current: InterviewPhase;
  next: InterviewPhase | null;
  elapsedMs: number;
  remainingMs: number;
  remainingInPhaseMs: number;
  exchanges: number;
  /** Time to thank the candidate and stop asking new questions. */
  shouldWrapUp: boolean;
  isOvertime: boolean;
}

/** No phase is worth opening for less than this. */
const MIN_PHASE_MS = 45_000;
/** Inside this much of the end, the interviewer starts closing. */
const WRAP_UP_MS = 60_000;
/**
 * How each recruiter spends the hour it does not have.
 *
 * `aggressive` and `passive` keep the same ground and differ only in tone,
 * which is already what their prompts do; they lean slightly differently on
 * pressure and on letting the candidate talk.
 */
const PHASE_SHARES: Record<
  InterviewRecruiterProfile,
  Record<InterviewPhase, number>
> = {
  [INTERVIEW_PROFILE_STANDARD]: {
    warmup: 0.08,
    background: 0.2,
    motivation: 0.14,
    skills: 0.26,
    company_fit: 0.1,
    expectations: 0.08,
    candidate_questions: 0.08,
    closing: 0.06,
  },
  [INTERVIEW_PROFILE_TECHNICAL]: {
    warmup: 0.06,
    background: 0.12,
    motivation: 0.08,
    skills: 0.46,
    company_fit: 0.08,
    expectations: 0.06,
    candidate_questions: 0.08,
    closing: 0.06,
  },
  [INTERVIEW_PROFILE_BEHAVIORAL]: {
    warmup: 0.06,
    background: 0.14,
    motivation: 0.12,
    skills: 0.44,
    company_fit: 0.06,
    expectations: 0.06,
    candidate_questions: 0.06,
    closing: 0.06,
  },
  [INTERVIEW_PROFILE_AGGRESSIVE]: {
    warmup: 0.06,
    background: 0.16,
    motivation: 0.16,
    skills: 0.3,
    company_fit: 0.12,
    expectations: 0.1,
    candidate_questions: 0.04,
    closing: 0.06,
  },
  [INTERVIEW_PROFILE_PASSIVE]: {
    warmup: 0.1,
    background: 0.22,
    motivation: 0.14,
    skills: 0.22,
    company_fit: 0.1,
    expectations: 0.08,
    candidate_questions: 0.08,
    closing: 0.06,
  },
};

/** Roughly one exchange per 90 seconds of phase, and never none. */
function minExchangesFor(slotMs: number) {
  return Math.max(1, Math.round(slotMs / 90_000));
}

/**
 * Lays the phases end to end over the chosen duration.
 *
 * Shares are floored at `MIN_PHASE_MS` and the surplus is taken back from the
 * longest phases, so a ten-minute interview still touches every phase instead
 * of allocating thirty-six seconds to the closing.
 */
export function buildAgenda(
  profile: InterviewRecruiterProfile,
  durationMinutes: number,
  options: { hasContext: boolean },
): InterviewAgenda {
  const durationMs = Math.max(MIN_PHASE_MS, durationMinutes * 60_000);
  const shares = PHASE_SHARES[profile] ?? PHASE_SHARES[INTERVIEW_PROFILE_STANDARD];
  const phases = INTERVIEW_PHASES.filter(
    // There is no offer to converge or diverge from in free practice.
    (phase) => options.hasContext || phase !== "company_fit",
  );

  const weights = normalize(phases.map((phase) => shares[phase]));
  const lengths = applyFloor(
    weights.map((weight) => weight * durationMs),
    durationMs,
  );

  let startMs = 0;

  return {
    durationMs,
    slots: phases.map((phase, index) => {
      const endMs =
        index === phases.length - 1 ? durationMs : startMs + lengths[index]!;
      const slot: AgendaSlot = {
        endMs,
        minExchanges: minExchangesFor(endMs - startMs),
        phase,
        startMs,
      };
      startMs = endMs;

      return slot;
    }),
  };
}

function normalize(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return total > 0
    ? weights.map((weight) => weight / total)
    : weights.map(() => 1 / weights.length);
}

/**
 * Raises anything under the floor, then takes the difference back from the
 * phases with the most to spare. A phase never drops below the floor twice.
 */
function applyFloor(lengths: number[], durationMs: number): number[] {
  const floor = Math.min(MIN_PHASE_MS, durationMs / lengths.length);
  const raised = lengths.map((length) => Math.max(length, floor));
  const surplus = raised.reduce((sum, length) => sum + length, 0) - durationMs;
  if (surplus <= 0) return raised;

  const spare = raised.map((length) => Math.max(0, length - floor));
  const totalSpare = spare.reduce((sum, length) => sum + length, 0);
  if (totalSpare <= 0) return raised.map(() => durationMs / lengths.length);

  return raised.map(
    (length, index) => length - (spare[index]! / totalSpare) * surplus,
  );
}

/** Where the interview should be, given the clock and what has been said. */
export function resolveAgendaState(
  agenda: InterviewAgenda,
  input: { elapsedMs: number; exchanges: number },
): AgendaState {
  const elapsedMs = Math.max(0, input.elapsedMs);
  const exchanges = Math.max(0, input.exchanges);
  const index = resolveIndex(agenda, elapsedMs, exchanges);
  const slot = agenda.slots[index]!;
  const remainingMs = agenda.durationMs - elapsedMs;

  return {
    current: slot.phase,
    elapsedMs,
    exchanges,
    isOvertime: remainingMs <= 0,
    next: agenda.slots[index + 1]?.phase ?? null,
    remainingInPhaseMs: Math.max(0, slot.endMs - elapsedMs),
    remainingMs: Math.max(0, remainingMs),
    shouldWrapUp: slot.phase === "closing" || remainingMs <= WRAP_UP_MS,
  };
}

/**
 * The later of where the clock says we are and where the conversation says we
 * are, so a terse candidate still progresses and a verbose one is still moved
 * on. Monotonic by construction: the interview never goes backwards.
 */
function resolveIndex(
  agenda: InterviewAgenda,
  elapsedMs: number,
  exchanges: number,
): number {
  const last = agenda.slots.length - 1;
  const byTime = agenda.slots.findIndex((slot) => elapsedMs < slot.endMs);

  let byExchanges = 0;
  let consumed = 0;
  for (const [index, slot] of agenda.slots.entries()) {
    consumed += slot.minExchanges;
    if (exchanges < consumed) {
      byExchanges = index;
      break;
    }
    byExchanges = Math.min(index + 1, last);
  }

  return Math.min(last, Math.max(byTime === -1 ? last : byTime, byExchanges));
}

/** The number of times the candidate has spoken. */
export function countExchanges(messages: Array<{ role: string }>): number {
  return messages.filter((message) => message.role === "user").length;
}

/** Milliseconds since the interview actually began. */
export function elapsedSince(startedAt: string | null, now = Date.now()) {
  if (!startedAt) return 0;

  const started = Date.parse(startedAt);

  return Number.isNaN(started) ? 0 : Math.max(0, now - started);
}
