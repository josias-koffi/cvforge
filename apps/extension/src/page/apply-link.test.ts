// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findApplyLink, formFieldCount } from "./apply-link";

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {} as DOMRect,
  ] as unknown as DOMRectList);
  (
    window as unknown as { happyDOM: { setURL(url: string): void } }
  ).happyDOM.setURL("https://jobs.lever.co/agicap/e0aa73bf");
});

describe("findApplyLink", () => {
  it("finds the same-site « Apply » link, the deeper one first", () => {
    document.body.innerHTML = `
      <a href="/agicap">Toutes les offres</a>
      <a href="https://www.linkedin.com/jobs/apply">Apply with LinkedIn</a>
      <a href="https://jobs.lever.co/other/apply">Apply</a>
      <a href="/agicap/e0aa73bf/apply">Apply for this job</a>`;
    expect(findApplyLink()).toBe("https://jobs.lever.co/agicap/e0aa73bf/apply");
  });

  it("accepts French wording and ignores other sites", () => {
    document.body.innerHTML = `
      <a href="https://forms.other.example/x">Postuler</a>
      <a href="https://careers.lever.co/form">Je postule</a>`;
    expect(findApplyLink()).toBe("https://careers.lever.co/form");
  });

  it("returns null when the page has no such link", () => {
    document.body.innerHTML = `<a href="#apply">Apply</a><a href="/about">À propos</a>`;
    expect(findApplyLink()).toBeNull();
  });
});

describe("formFieldCount", () => {
  it("counts the fields a candidate fills, not hidden or search ones", () => {
    document.body.innerHTML = `
      <input type="search"><input type="hidden"><button>Go</button>
      <input name="name"><input type="email"><textarea></textarea><input type="file">`;
    expect(formFieldCount()).toBe(4);
  });
});
