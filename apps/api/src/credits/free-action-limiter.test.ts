import { describe, expect, it } from "vitest";
import { FreeActionLimiter } from "./free-action-limiter";

describe("FreeActionLimiter", () => {
  const DAY = 24 * 60 * 60 * 1000;

  it("lets an account run an action up to its daily cap, then answers 429", () => {
    const now = 1_000_000;
    const limiter = new FreeActionLimiter(undefined, () => now, {
      cv_import: 2,
      cv_translation: 2,
    });

    limiter.assertWithinLimit("cv_import", "a@x.fr");
    limiter.assertWithinLimit("cv_import", "a@x.fr");

    expect(() => limiter.assertWithinLimit("cv_import", "a@x.fr")).toThrowError(
      expect.objectContaining({ status: 429 }),
    );
  });

  it("counts per account and per action, ignoring the email's case", () => {
    const limiter = new FreeActionLimiter(undefined, () => 5, {
      cv_import: 1,
      cv_translation: 1,
    });

    limiter.assertWithinLimit("cv_import", "A@x.fr");

    expect(() => limiter.assertWithinLimit("cv_import", "a@x.fr")).toThrow();
    expect(() => limiter.assertWithinLimit("cv_translation", "a@x.fr")).not.toThrow();
    expect(() => limiter.assertWithinLimit("cv_import", "b@x.fr")).not.toThrow();
  });

  it("frees the allowance once a day has passed", () => {
    let now = 10 * DAY;
    const limiter = new FreeActionLimiter(undefined, () => now, {
      cv_import: 1,
      cv_translation: 1,
    });

    limiter.assertWithinLimit("cv_import", "a@x.fr");
    now += DAY + 1;

    expect(() => limiter.assertWithinLimit("cv_import", "a@x.fr")).not.toThrow();
  });
});
