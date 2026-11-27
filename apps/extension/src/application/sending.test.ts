import { describe, expect, it, vi } from "vitest";
import type { ApplicationSummary } from "../domain/offer";
import type { FormSnapshot } from "../page/form-state";
import type { ActiveTab } from "./preparation";
import { Sending, type FormTab, type LastFill } from "./sending";

const FORM_URL = "https://jobs.lever.co/acme/1/apply";
const TAB: ActiveTab = { tabId: 4, title: "Apply", url: FORM_URL };
const FILL: LastFill = {
  applicationId: "a1",
  documents: ["CV Camille Test.pdf", "Lettre de motivation Camille Test.pdf"],
  drafted: [],
  tabId: 4,
};
const FORM: FormSnapshot = {
  fields: [{ label: "E-mail", value: "c@example.com" }],
  captcha: false,
  multiStep: false,
  optionalEmpty: [],
  requiredEmpty: [],
  submitLabel: "Submit application",
};
const app = (over: Partial<ApplicationSummary> = {}): ApplicationSummary => ({
  company: "Acme",
  cvGeneratedAt: "x",
  id: "a1",
  letterGeneratedAt: "y",
  offerUrl: "https://jobs.lever.co/acme/1",
  status: "draft",
  title: "Dev",
  ...over,
});

function setup(
  options: {
    application?: ApplicationSummary;
    form?: Partial<FormSnapshot>;
    pages?: { url: string; text: string }[];
    lastFill?: LastFill | null;
  } = {},
) {
  const views = [
    { text: "Apply. Thank you for your interest in Acme", url: FORM_URL },
    ...(options.pages ?? [{ text: "Application submitted!", url: FORM_URL }]),
  ];
  const form: FormTab = {
    capture: vi.fn(async () => ({
      base64: "AAAA",
      type: "image/jpeg" as const,
    })),
    observe: vi.fn(async () => (views.length > 1 ? views.shift()! : views[0]!)),
    read: vi.fn(async () => ({ ...FORM, ...options.form })),
    submit: vi.fn(async () => ({
      clicked: true as const,
      label: "Submit application",
    })),
  };
  const call = vi.fn(async (name: string) => {
    if (name === "list_applications") return [options.application ?? app()];
    if (name === "record_submission")
      return { confirmed: true, submissionId: "s1" };
    if (name === "save_screening_answer") return { saved: true };
    throw new Error(name);
  });
  const sending = new Sending({
    form,
    lastFill: () => (options.lastFill === undefined ? FILL : options.lastFill),
    pages: { activeTab: async () => TAB, readText: async () => "" },
    sleep: async () => undefined,
    tools: { call },
  });
  return { call, form, sending };
}

describe("Sending.review", () => {
  it("shows the offer, the documents and every filled field before anything is sent", async () => {
    const { form, sending } = setup();
    expect(await sending.review()).toEqual({
      application: {
        company: "Acme",
        id: "a1",
        offerUrl: "https://jobs.lever.co/acme/1",
        title: "Dev",
      },
      captcha: false,
      documents: FILL.documents,
      drafted: [],
      fields: FORM.fields,
      kind: "review",
      refusal: null,
      requiredEmpty: [],
      submitLabel: "Submit application",
      url: FORM_URL,
    });
    expect(form.submit).not.toHaveBeenCalled();
  });

  it("has nothing to review in a tab the extension did not fill", async () => {
    expect(await setup({ lastFill: null }).sending.review()).toEqual({
      kind: "nothing",
    });
  });

  it.each([
    [{ application: app({ status: "sent" }) }, "déjà été envoyée"],
    [
      { application: app({ offerUrl: "https://careers.other.example/1" }) },
      "pas sur le site",
    ],
    [{ form: { requiredEmpty: ["Téléphone"] } }, "Téléphone"],
    [{ form: { multiStep: true, submitLabel: null } }, "plusieurs étapes"],
    [{ form: { submitLabel: null } }, "introuvable"],
  ])("keeps « Valider et envoyer » off when %o", async (options, reason) => {
    expect(await setup(options).sending.review()).toMatchObject({
      refusal: expect.stringContaining(reason),
    });
  });
});

describe("Sending.send", () => {
  it("clicks, sees the confirmation, captures it and records the proof", async () => {
    const { call, form, sending } = setup();
    expect(await sending.send({ applicationId: "a1", url: FORM_URL })).toEqual({
      confirmationUrl: FORM_URL,
      confirmed: true,
      recorded: true,
    });
    expect(form.submit).toHaveBeenCalledWith(4);
    expect(call).toHaveBeenCalledWith("record_submission", {
      applicationId: "a1",
      confirmationUrl: FORM_URL,
      confirmed: true,
      documents: FILL.documents,
      fields: FORM.fields,
      formUrl: FORM_URL,
      screenshotBase64: "AAAA",
      screenshotType: "image/jpeg",
    });
  });

  it("shows the drafted answers as the page holds them, and keeps them once sent (US-208)", async () => {
    const question = "Why do you want to join Acme?";
    const { call, sending } = setup({
      form: {
        fields: [
          ...FORM.fields,
          { label: question, value: "Corrigé par le candidat." },
        ],
      },
      lastFill: {
        ...FILL,
        drafted: [
          { answer: "Brouillon.", question },
          { answer: "Effacé.", question: "Anything else?" },
        ],
      },
    });
    const review = await sending.review();
    expect(review.kind === "review" && review.drafted).toEqual([
      { answer: "Corrigé par le candidat.", question },
      { answer: "Effacé.", question: "Anything else?" },
    ]);
    await sending.send({ applicationId: "a1", url: FORM_URL });
    expect(call).toHaveBeenCalledWith("save_screening_answer", {
      answer: "Corrigé par le candidat.",
      question,
    });
    expect(
      call.mock.calls.filter(([name]) => name === "save_screening_answer"),
    ).toHaveLength(1);
  });

  it("records an unconfirmed sending as such, never as sent", async () => {
    const { call, sending } = setup({
      pages: [
        { text: "Apply. Thank you for your interest in Acme", url: FORM_URL },
      ],
    });
    expect(
      await sending.send({ applicationId: "a1", url: FORM_URL }),
    ).toMatchObject({
      confirmed: false,
    });
    expect(call).toHaveBeenCalledWith(
      "record_submission",
      expect.objectContaining({ confirmationUrl: null, confirmed: false }),
    );
  });

  it("keeps the proof even when the screenshot fails", async () => {
    const { call, form, sending } = setup();
    vi.mocked(form.capture).mockRejectedValueOnce(new Error("no permission"));
    await sending.send({ applicationId: "a1", url: FORM_URL });
    expect(call).toHaveBeenCalledWith(
      "record_submission",
      expect.objectContaining({ screenshotBase64: null, screenshotType: null }),
    );
  });

  it("checks everything again right before clicking", async () => {
    const sent = setup({ application: app({ status: "sent" }) });
    await expect(
      sent.sending.send({ applicationId: "a1", url: FORM_URL }),
    ).rejects.toThrow("déjà été envoyée");
    expect(sent.form.submit).not.toHaveBeenCalled();

    const other = setup();
    await expect(
      other.sending.send({
        applicationId: "a1",
        url: "https://jobs.lever.co/other",
      }),
    ).rejects.toThrow("onglet a changé");
    await expect(
      other.sending.send({ applicationId: "zz", url: FORM_URL }),
    ).rejects.toThrow("Remplissez d'abord");
    expect(other.form.submit).not.toHaveBeenCalled();
  });

  it("stops when the button cannot be clicked", async () => {
    const { call, form, sending } = setup();
    vi.mocked(form.submit).mockResolvedValueOnce({
      clicked: false,
      reason: "Bouton ambigu",
    });
    await expect(
      sending.send({ applicationId: "a1", url: FORM_URL }),
    ).rejects.toThrow("Bouton ambigu");
    expect(call).not.toHaveBeenCalledWith(
      "record_submission",
      expect.anything(),
    );
  });
});
