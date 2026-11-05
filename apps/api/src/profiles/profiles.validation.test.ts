import { describe, expect, it } from "vitest";
import { assertStorableRegistry, MAX_PROFILES_PER_USER } from "./profiles.validation";
import type { StoredProfileRegistry } from "./profiles.types";

const profile = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, label: "Profil", headline: "", identity: {}, sections: {}, preferences: {}, meta: {}, ...extra });

function registry(profiles: unknown[]) {
  return { activeProfileId: "a", profiles, userEmail: "u@example.com", version: 2 } as unknown as StoredProfileRegistry;
}

describe("assertStorableRegistry", () => {
  it("should accept an ordinary registry", () => {
    expect(() => assertStorableRegistry(registry([profile("a"), profile("b")]))).not.toThrow();
  });

  it("should refuse too many profiles", () => {
    const many = Array.from({ length: MAX_PROFILES_PER_USER + 1 }, (_, i) => profile(`p${i}`));
    expect(() => assertStorableRegistry(registry(many))).toThrow(/plus de/);
  });

  it("should refuse an oversized registry", () => {
    expect(() => assertStorableRegistry(registry([profile("a", { headline: "x" })].concat(
      [profile("b", { sections: { blob: "y".repeat(600 * 1024) } })],
    )))).toThrow(/volumineux/);
  });

  it("should refuse duplicate, empty or non-string ids and malformed sections", () => {
    expect(() => assertStorableRegistry(registry([profile("a"), profile("a")]))).toThrow(/duplique/);
    expect(() => assertStorableRegistry(registry([profile("")]))).toThrow(/invalide/);
    expect(() => assertStorableRegistry(registry([profile("a", { id: 5 })]))).toThrow(/invalide/);
    expect(() => assertStorableRegistry(registry([profile("a", { sections: [] })]))).toThrow(/sections/);
    expect(() => assertStorableRegistry(registry([profile("a", { label: "x".repeat(400) })]))).toThrow(/Libelle/);
  });
});
