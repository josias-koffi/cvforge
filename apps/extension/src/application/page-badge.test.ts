import { describe, expect, it, vi } from "vitest";
import type { PageSignals } from "../domain/badge";
import { PageBadge, type BadgeHost } from "./page-badge";

const FORM: PageSignals = { applyLink: null, fieldCount: 6, fileInput: true };

function setup(options: { access?: boolean; failing?: boolean } = {}) {
  let now = 0;
  const host: BadgeHost = {
    canReadPages: vi.fn(async () => options.access ?? true),
    probe: vi.fn(async () => FORM),
    show: vi.fn(async () => undefined),
  };
  const call = vi.fn(async (name: string) => {
    if (options.failing) throw new Error("Non connecté");
    if (name === "get_daily_offers")
      return {
        matches: [
          { applyUrl: "https://jobs.lever.co/a/1", score: 91, title: "Dev" },
        ],
      };
    if (name === "list_recent_offers") return [];
    return [{ offerUrl: "https://jobs.ashbyhq.com/b/2", title: "Ops" }];
  });
  const badge = new PageBadge({ host, now: () => now, tools: { call } });
  return { badge, call, host, tick: (ms: number) => (now += ms) };
}

describe("PageBadge (US-207)", () => {
  it("shows this morning's score, then a prepared application's check mark", async () => {
    const f = setup();
    expect(
      await f.badge.update(4, "https://jobs.lever.co/a/1/apply"),
    ).toMatchObject({ text: "91" });
    expect(
      await f.badge.update(5, "https://jobs.ashbyhq.com/b/2/application"),
    ).toMatchObject({
      text: "✓",
      title: "JobSpark peut remplir la candidature « Ops »",
    });
    expect(f.host.show).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ text: "91" }),
    );
  });

  it("injects nothing on LinkedIn (US-210)", async () => {
    const f = setup();
    expect(
      await f.badge.update(1, "https://www.linkedin.com/jobs/view/1"),
    ).toBeNull();
    expect(f.host.probe).not.toHaveBeenCalled();
  });

  it("lists the offers once per ten minutes", async () => {
    const f = setup();
    await f.badge.update(1, "https://x.io/a");
    await f.badge.update(1, "https://x.io/b");
    expect(f.call).toHaveBeenCalledTimes(3);
    f.tick(11 * 60 * 1000);
    await f.badge.update(1, "https://x.io/c");
    expect(f.call).toHaveBeenCalledTimes(6);
  });

  it("reads no page without access, and still marks forms when signed out", async () => {
    const none = setup({ access: false });
    expect(await none.badge.update(1, "https://jobs.lever.co/a/1")).toBeNull();
    expect(none.host.probe).not.toHaveBeenCalled();
    expect(none.host.show).toHaveBeenCalledWith(1, null);

    const out = setup({ failing: true });
    expect(
      await out.badge.update(1, "https://boards.greenhouse.io/b/1"),
    ).toMatchObject({ text: "✓" });
  });
});
