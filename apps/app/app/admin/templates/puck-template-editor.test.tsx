// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  lastPuckProps,
  sampleData,
  toPuckConfigMock,
} = vi.hoisted(() => ({
  lastPuckProps: { current: null as null | Record<string, unknown> },
  sampleData: { content: [], root: { props: {} } },
  toPuckConfigMock: vi.fn(() => ({ components: {} })),
}));

vi.mock("@puckeditor/core", () => ({
  Puck: (props: Record<string, unknown>) => {
    lastPuckProps.current = props;
    return (
      <button
        onClick={() => void (props.onPublish as (data: unknown) => Promise<void>)(sampleData)}
        type="button"
      >
        Publish layout
      </button>
    );
  },
}));

vi.mock("@cvforge/ui", () => ({
  documentBlockRegistry: {},
  toPuckConfig: toPuckConfigMock,
}));

import { PuckTemplateEditor } from "./puck-template-editor";

describe("PuckTemplateEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    globalThis.fetch = vi.fn();
    lastPuckProps.current = null;
    toPuckConfigMock.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("publishes layout updates and shows the saved status", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    await act(async () => {
      root.render(
        <PuckTemplateEditor
          initialData={sampleData}
          kind="cv"
          templateId="template-cv-ats"
        />,
      );
    });

    expect(toPuckConfigMock).toHaveBeenCalledWith({}, "cv");
    expect(lastPuckProps.current?.data).toEqual(sampleData);

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/admin/templates/publish-layout",
      expect.objectContaining({
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    );
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body))).toEqual({
      layout: sampleData,
      templateId: "template-cv-ats",
    });
    expect(container.textContent).toContain("Layout enregistré avec succès.");
  });

  it("shows the error state when publishing fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    await act(async () => {
      root.render(
        <PuckTemplateEditor
          initialData={sampleData}
          kind="letter"
          templateId="template-letter-ats"
        />,
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(container.textContent).toContain("Erreur lors de l'enregistrement du layout.");
  });
});
