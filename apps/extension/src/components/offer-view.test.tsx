import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { OfferInspection } from "../application/preparation";
import { OfferView, type OfferViewProps } from "./OfferView";

const noop = () => undefined;
const page = (over: Partial<Extract<OfferInspection, { kind: "page" }>> = {}) =>
  ({
    balance: 20,
    existing: null,
    kind: "page",
    page: {
      host: "jobs.example.com",
      title: "Dev — Acme",
      url: "https://jobs.example.com/1",
    },
    plan: { alreadySent: false, cost: 7, steps: ["import", "cv", "letter"] },
    ...over,
  }) as OfferInspection;

const render = (props: Partial<OfferViewProps>) =>
  renderToStaticMarkup(
    <OfferView
      busy={false}
      confirming={false}
      inspection={null}
      result={null}
      onAllow={noop}
      onAsk={noop}
      onCancel={noop}
      onConfirm={noop}
      {...props}
    />,
  );

describe("OfferView", () => {
  it("asks for page access and says when pages are read", () => {
    const html = render({ inspection: { kind: "no-access" } });
    expect(html).toContain("Autoriser l&#x27;accès aux pages");
    expect(html).toContain("Préparer");
  });

  it("invites to open an offer", () => {
    expect(render({ inspection: { kind: "no-page" } })).toContain(
      "Ouvrez la page",
    );
  });

  it("details the cost of each step before anything is spent", () => {
    const html = render({ inspection: page() });
    expect(html).toContain("Analyse de l&#x27;offre");
    expect(html).toContain("CV adapté à l&#x27;offre");
    expect(html).toContain("Lettre de motivation");
    expect(html).toContain("7 crédits");
    expect(html).toContain("solde : 20 crédits");
    expect(html).toContain("Préparer la candidature");
    expect(html).not.toContain("Confirmer");
  });

  it("asks to confirm the amount", () => {
    expect(render({ confirming: true, inspection: page() })).toContain(
      "Confirmez-vous la dépense de 7 crédits",
    );
  });

  it("blocks when the balance is short", () => {
    const html = render({ inspection: page({ balance: 2 }) });
    expect(html).toContain("Solde insuffisant");
    expect(html).not.toContain("Préparer la candidature");
  });

  it("flags an offer already sent and one already prepared", () => {
    expect(
      render({
        inspection: page({ plan: { alreadySent: true, cost: 0, steps: [] } }),
      }),
    ).toContain("déjà envoyée");
    expect(
      render({
        inspection: page({ plan: { alreadySent: false, cost: 0, steps: [] } }),
      }),
    ).toContain("déjà générés");
  });

  it("reports what was prepared and spent", () => {
    const html = render({
      inspection: page(),
      result: {
        applicationId: "a1",
        balanceAfter: 13,
        company: "Acme",
        creditsSpent: 7,
        title: "Dev",
      },
    });
    expect(html).toContain("Candidature préparée : Dev chez Acme");
    expect(html).toContain("7 crédits dépensés, solde : 13 crédits");
  });
});
