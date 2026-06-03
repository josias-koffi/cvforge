import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSessionMock, fetchMock, notFoundMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  notFoundMock: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  requireSessionMock: vi.fn(),
}));

vi.mock("../../auth/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [{ name: "cvforge_session", value: "cookie-value" }],
  }),
}));

vi.mock("../../notifications/notification-bell", () => ({
  NotificationBell: () => null,
}));

vi.mock("./candidature-detail-tabs", () => ({
  CandidatureDetailTabs: ({
    application,
    statusUpdated,
  }: {
    application: { extracted: { title: string } };
    statusUpdated?: boolean;
  }) => <div data-testid="tabs">{application.extracted.title}:{String(statusUpdated)}</div>,
}));

vi.stubGlobal("fetch", fetchMock);

import CandidatureDetailPage from "./page";

const baseApp = {
  createdAt: "2026-04-20T12:00:00.000Z",
  cvGeneratedAt: null,
  id: "app_abc",
  interviewReports: [],
  letterGeneratedAt: null,
  offerTextPreview: "preview",
  offerUrl: null,
  sourceLabel: "text",
  sourceType: "text",
  status: "draft",
  statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" }],
  updatedAt: "2026-04-20T12:00:00.000Z",
  userEmail: "user@example.com",
  extracted: {
    companyName: "Acme",
    contractType: null,
    language: "fr",
    location: null,
    requirements: [],
    responsibilities: [],
    salaryRange: null,
    summary: "desc",
    title: "Dev Frontend",
  },
};

beforeEach(() => {
  requireSessionMock.mockResolvedValue({
    email: "user@example.com",
    role: "user",
  });
});

describe("CandidatureDetailPage", () => {
  it("renders the detail tabs when the application is found", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ application: baseApp }),
    });

    const html = renderToStaticMarkup(
      await CandidatureDetailPage({ params: Promise.resolve({ id: "app_abc" }) }),
    );

    expect(html).toContain("Dev Frontend");
  });

  it("passes status update feedback when the query matches the application", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ application: baseApp }),
    });

    const html = renderToStaticMarkup(
      await CandidatureDetailPage({
        params: Promise.resolve({ id: "app_abc" }),
        searchParams: Promise.resolve({ statusUpdated: "app_abc" }),
      }),
    );

    expect(html).toContain("Dev Frontend:true");
  });

  it("calls notFound when the API returns 404", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(
      CandidatureDetailPage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when the API returns a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(
      CandidatureDetailPage({ params: Promise.resolve({ id: "app_abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
