import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const EMPTY_PUCK_DATA = { content: [], root: { props: {} } };

describe("templates publish-layout route", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it("forwards layout update to PUT /templates/:id and returns ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ template: { id: "template-cv-ats" } }),
      ok: true,
    } as Response);

    const response = await POST(
      new Request("http://localhost/admin/templates/publish-layout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "cvforge_session=session-token",
        },
        body: JSON.stringify({ templateId: "template-cv-ats", layout: EMPTY_PUCK_DATA }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, templateId: "template-cv-ats" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/templates/template-cv-ats"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ layout: EMPTY_PUCK_DATA }),
      }),
    );
  });

  it("returns 400 when body is not valid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/admin/templates/publish-layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 when templateId is missing", async () => {
    const response = await POST(
      new Request("http://localhost/admin/templates/publish-layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layout: EMPTY_PUCK_DATA }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 when layout is missing", async () => {
    const response = await POST(
      new Request("http://localhost/admin/templates/publish-layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: "template-cv-ats" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns error when the NestJS API responds with an error", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const response = await POST(
      new Request("http://localhost/admin/templates/publish-layout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId: "missing-id", layout: EMPTY_PUCK_DATA }),
      }),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });
});
