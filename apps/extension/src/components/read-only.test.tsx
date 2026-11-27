// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { ReadOnlyOptions } from "../application/read-only-apply";
import { readOnlySite } from "../domain/submission";
import { askBackground } from "../messages";
import { ReadOnlyCard } from "./ReadOnlyCard";

vi.mock("../messages", () => ({ askBackground: vi.fn() }));
const ask = vi.mocked(askBackground);
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS: ReadOnlyOptions = {
  application: { company: "Acme", id: "a1", status: "draft", title: "Dev" },
  documents: { cv: true, letter: true },
  kind: "read-only",
  site: "LinkedIn",
};

let container: HTMLDivElement;
let root: Root;
const render = (node: React.ReactNode) => act(async () => root.render(node));
const click = (text: string) =>
  act(async () => {
    [...container.querySelectorAll("button")]
      .find((b) => b.textContent?.startsWith(text))!
      .click();
  });

beforeEach(() => {
  fakeBrowser.reset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  ask.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("readOnlySite", () => {
  it("names LinkedIn and Indeed, nothing else", () => {
    expect(readOnlySite("https://www.linkedin.com/jobs/view/1")).toBe(
      "LinkedIn",
    );
    expect(readOnlySite("https://fr.indeed.com/viewjob?jk=1")).toBe("Indeed");
    expect(readOnlySite("https://jobs.lever.co/a/1")).toBeNull();
    expect(readOnlySite("pas une adresse")).toBeNull();
  });
});

describe("ReadOnlyCard (US-210)", () => {
  it("opens a document, then marks the application sent", async () => {
    const changed = vi.fn();
    await render(<ReadOnlyCard options={OPTIONS} onChange={changed} />);
    expect(container.textContent).toContain("JobSpark ne remplit rien");

    const create = vi.spyOn(browser.tabs, "create");
    ask.mockResolvedValueOnce("https://files/cv.pdf");
    await click("CV (PDF)");
    expect(ask).toHaveBeenCalledWith({
      applicationId: "a1",
      kind: "cv",
      type: "document-link",
    });
    expect(create).toHaveBeenCalledWith({ url: "https://files/cv.pdf" });

    ask.mockResolvedValueOnce({ status: "sent" });
    await click("Je l'ai envoyée");
    expect(ask).toHaveBeenLastCalledWith({
      applicationId: "a1",
      type: "mark-sent",
    });
    expect(changed).toHaveBeenCalled();
  });

  it("asks to prepare first, and shows a sent application as such", async () => {
    await render(
      <ReadOnlyCard
        options={{
          ...OPTIONS,
          application: null,
          documents: { cv: false, letter: false },
        }}
        onChange={() => undefined}
      />,
    );
    expect(container.textContent).toContain("Préparez d'abord");
    await render(
      <ReadOnlyCard
        options={{
          ...OPTIONS,
          application: { ...OPTIONS.application!, status: "sent" },
        }}
        onChange={() => undefined}
      />,
    );
    expect(container.textContent).toContain("marquée comme envoyée");
  });
});
