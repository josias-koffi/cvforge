// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  cvContent,
  initialData,
  lastPuckProps,
  toPuckConfigMock,
  puckDataToCvContentMock,
} = vi.hoisted(() => ({
  cvContent: {
    certifications: [],
    education: [],
    experience: [],
    header: {
      city: "Paris",
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      phone: "+33 6 00 00 00 00",
      title: "Product Engineer",
    },
    languages: [],
    projects: [],
    skills: { hard: [], soft: [] },
    summary: "Resume",
  },
  initialData: { content: [], root: { props: {} } },
  lastPuckProps: { current: null as null | Record<string, unknown> },
  puckDataToCvContentMock: vi.fn(),
  toPuckConfigMock: vi.fn(() => ({ components: {} })),
}));

vi.mock("@puckeditor/core", () => ({
  Puck: (props: Record<string, unknown>) => {
    lastPuckProps.current = props;
    return (
      <button
        onClick={() => void (props.onPublish as (data: unknown) => Promise<void>)(initialData)}
        type="button"
      >
        Save CV
      </button>
    );
  },
}));

vi.mock("@cvforge/ui", () => ({
  documentBlockRegistry: {},
  toPuckConfig: toPuckConfigMock,
}));

vi.mock("./puck-data-to-cv-content", () => ({
  puckDataToCvContent: puckDataToCvContentMock,
}));

import { PuckCvEditor } from "./puck-cv-editor";

describe("PuckCvEditor", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    globalThis.fetch = vi.fn();
    lastPuckProps.current = null;
    puckDataToCvContentMock.mockReset();
    puckDataToCvContentMock.mockReturnValue(cvContent);
    toPuckConfigMock.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("saves the converted CV content and shows the success message", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
    } as Response);

    await act(async () => {
      root.render(
        <PuckCvEditor
          applicationId="application-123"
          initialData={initialData}
        />,
      );
    });

    expect(toPuckConfigMock).toHaveBeenCalledWith({}, "cv");
    expect(lastPuckProps.current?.permissions).toEqual({
      delete: false,
      drag: false,
      duplicate: false,
      insert: false,
    });

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(puckDataToCvContentMock).toHaveBeenCalledWith(initialData);
    expect(fetch).toHaveBeenCalledWith(
      "/cv/application-123/save",
      expect.objectContaining({
        body: JSON.stringify({ cvContent }),
        method: "PUT",
      }),
    );
    expect(container.textContent).toContain("Les modifications du CV ont été enregistrées.");
  });

  it("surfaces API errors to the user", async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: async () => ({ message: "Sauvegarde impossible" }),
      ok: false,
    } as Response);

    await act(async () => {
      root.render(
        <PuckCvEditor
          applicationId="application-456"
          initialData={initialData}
        />,
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(container.textContent).toContain("Sauvegarde impossible");
  });
});
