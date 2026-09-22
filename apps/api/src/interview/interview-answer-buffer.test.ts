import { describe, expect, it } from "vitest";
import {
  ANSWER_BUFFER_MAX_ANSWERS,
  ANSWER_BUFFER_MAX_BYTES,
  ANSWER_BUFFER_TTL_MS,
  AnswerTooLongError,
  InterviewAnswerBuffer,
  TooManyAnswersError,
  answerKey,
} from "./interview-answer-buffer";

const KEY = answerKey("candidate@example.com", "interview_1", "interview_1-1");

/** A buffer whose clock the test drives. */
function atClock() {
  let now = 1_000;

  return {
    advance: (ms: number) => {
      now += ms;
    },
    buffer: new InterviewAnswerBuffer(() => now),
  };
}

describe("answerKey", () => {
  it("separates one candidate's answers from another's", () => {
    // The turn id comes from the browser, so it cannot be the whole key:
    // guessing someone else's would feed audio into their interview.
    expect(answerKey("a@example.com", "s", "c")).not.toBe(
      answerKey("b@example.com", "s", "c"),
    );
  });
});

describe("InterviewAnswerBuffer", () => {
  it("gives back nothing for an answer that was never streamed", () => {
    expect(new InterviewAnswerBuffer().take(KEY)).toBeNull();
  });

  it("assembles the pieces in order, whatever order they arrived in", () => {
    // Concurrent requests do not finish in the order they were sent.
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 2, Buffer.from("ccc"));
    buffer.append(KEY, 0, Buffer.from("aaa"));
    buffer.append(KEY, 1, Buffer.from("bbb"));

    expect(buffer.take(KEY)?.toString()).toBe("aaabbbccc");
  });

  it("counts what it holds, which is what the studio checks against", () => {
    const buffer = new InterviewAnswerBuffer();

    expect(buffer.append(KEY, 0, Buffer.from("a"))).toBe(1);
    expect(buffer.append(KEY, 1, Buffer.from("b"))).toBe(2);
  });

  it("replaces a repeated position rather than duplicating it", () => {
    // A retried upload must not double a quarter-second of speech.
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 0, Buffer.from("aaa"));
    expect(buffer.append(KEY, 0, Buffer.from("zz"))).toBe(1);

    expect(buffer.take(KEY)?.toString()).toBe("zz");
  });

  it("releases the answer once it is taken", () => {
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 0, Buffer.from("a"));
    buffer.take(KEY);

    expect(buffer.take(KEY)).toBeNull();
    expect(buffer.size()).toBe(0);
  });

  it("drops an answer nobody came back for", () => {
    const { advance, buffer } = atClock();

    buffer.append(KEY, 0, Buffer.from("a"));
    advance(ANSWER_BUFFER_TTL_MS + 1);

    expect(buffer.take(KEY)).toBeNull();
    expect(buffer.size()).toBe(0);
  });

  it("keeps an answer alive while it is still being spoken", () => {
    const { advance, buffer } = atClock();

    buffer.append(KEY, 0, Buffer.from("a"));
    advance(ANSWER_BUFFER_TTL_MS - 1);
    buffer.append(KEY, 1, Buffer.from("b"));
    advance(ANSWER_BUFFER_TTL_MS - 1);

    expect(buffer.take(KEY)?.toString()).toBe("ab");
  });

  it("refuses more audio than an answer could possibly be", () => {
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 0, Buffer.alloc(ANSWER_BUFFER_MAX_BYTES));

    expect(() => buffer.append(KEY, 1, Buffer.from("a"))).toThrow(
      AnswerTooLongError,
    );
  });

  it("counts a replaced piece once when checking the ceiling", () => {
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 0, Buffer.alloc(ANSWER_BUFFER_MAX_BYTES));

    expect(() =>
      buffer.append(KEY, 0, Buffer.alloc(ANSWER_BUFFER_MAX_BYTES)),
    ).not.toThrow();
  });

  it("refuses to hold more answers at once than it was sized for", () => {
    const buffer = new InterviewAnswerBuffer();

    for (let index = 0; index < ANSWER_BUFFER_MAX_ANSWERS; index += 1) {
      buffer.append(answerKey("a@example.com", "s", `c${index}`), 0, Buffer.from("a"));
    }

    expect(() => buffer.append(KEY, 0, Buffer.from("a"))).toThrow(
      TooManyAnswersError,
    );
  });

  it("still takes more audio for an answer it already holds when full", () => {
    // The ceiling is on how many candidates are mid-answer, not on how long
    // any one of them talks.
    const buffer = new InterviewAnswerBuffer();

    for (let index = 1; index < ANSWER_BUFFER_MAX_ANSWERS; index += 1) {
      buffer.append(answerKey("a@example.com", "s", `c${index}`), 0, Buffer.from("a"));
    }
    buffer.append(KEY, 0, Buffer.from("a"));

    expect(() => buffer.append(KEY, 1, Buffer.from("b"))).not.toThrow();
  });

  it("frees room once expired answers are swept", () => {
    const { advance, buffer } = atClock();

    for (let index = 0; index < ANSWER_BUFFER_MAX_ANSWERS; index += 1) {
      buffer.append(answerKey("a@example.com", "s", `c${index}`), 0, Buffer.from("a"));
    }
    advance(ANSWER_BUFFER_TTL_MS + 1);

    expect(() => buffer.append(KEY, 0, Buffer.from("a"))).not.toThrow();
  });

  it("forgets an answer that was abandoned", () => {
    const buffer = new InterviewAnswerBuffer();

    buffer.append(KEY, 0, Buffer.from("a"));
    buffer.discard(KEY);

    expect(buffer.take(KEY)).toBeNull();
  });
});
