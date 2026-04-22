import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  type CreditLedgerEntry,
  type CreditLedgerSummary,
  creditPackIds,
  creditPacks,
} from "@cvforge/types";
import {
  AppShell,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cvforge/ui";
import { getServerApiUrl } from "../auth-config";
import { getAppNavigation } from "../content";
import { requireSession } from "../auth/session";

const FULL_APPLICATION_CREDIT_COST = 17;

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchCreditsSummary() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/credits/me`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer le solde de credits.");
  }

  const payload = (await response.json()) as { credits: CreditLedgerSummary };

  return payload.credits;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(valueCents: number) {
  return (valueCents / 100).toLocaleString("fr-FR", {
    currency: "EUR",
    style: "currency",
  });
}

function resolveEntryDetails(entry: CreditLedgerEntry) {
  if (entry.type === "stripe_purchase") {
    const pack = entry.metadata.packId
      ? creditPacks[entry.metadata.packId as keyof typeof creditPacks]
      : null;

    return {
      amountLabel: pack ? formatCurrency(pack.priceCents) : null,
      badgeLabel: "Achat confirme",
      title: pack ? `Pack ${pack.label}` : "Achat de credits",
    };
  }

  if (entry.type === "admin_grant") {
    return {
      amountLabel: null,
      badgeLabel: "Attribution admin",
      title: "Attribution manuelle",
    };
  }

  return {
    amountLabel: null,
    badgeLabel: "Consommation IA",
    title: entry.note ?? "Action IA",
  };
}

export default async function CreditsPage() {
  const session = await requireSession();
  const summary = await fetchCreditsSummary();
  const maxPackCredits = Math.max(
    ...creditPackIds.map((packId) => creditPacks[packId].credits),
  );
  const gaugeRatio = Math.min(summary.balance / maxPackCredits, 1);
  const remainingApplications = Math.floor(
    summary.balance / FULL_APPLICATION_CREDIT_COST,
  );

  return (
    <AppShell
      title="Mes credits"
      description="Solde disponible, transparence du ledger et acces direct au rechargement Stripe."
      navigation={getAppNavigation("/credits")}
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {summary.isLowBalance ? (
          <Card>
            <CardContent
              style={{
                backgroundColor: "#FFF3D6",
                borderRadius: "1rem",
                padding: "1rem 1.25rem",
              }}
            >
              <p style={{ color: "#5C3B00", lineHeight: 1.6, margin: 0 }}>
                Solde bas: il reste {summary.balance} credits. Recharge recommandee sous{" "}
                {summary.lowBalanceThreshold} credits pour eviter de bloquer une
                candidature complete.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{summary.balance} credits</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Solde courant pour {session.email}
              </p>
            </CardHeader>
            <CardContent style={{ display: "grid", gap: "0.75rem" }}>
              <div
                aria-hidden="true"
                style={{
                  backgroundColor: "#E6E1D8",
                  borderRadius: "999px",
                  height: "0.85rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(90deg, #7F8C69 0%, #A9B18F 100%)",
                    height: "100%",
                    width: `${Math.max(gaugeRatio * 100, 4)}%`,
                  }}
                />
              </div>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Jauge visuelle calibree sur le plus grand pack MVP ({maxPackCredits}{" "}
                credits).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{remainingApplications}</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Candidature complete{remainingApplications > 1 ? "s" : ""} restante
                {remainingApplications > 1 ? "s" : ""}
              </p>
            </CardHeader>
            <CardContent>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Estimation basee sur 17 credits pour enrichissement + CV + lettre +
                interview.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{summary.history.length}</CardTitle>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Mouvements enregistres
              </p>
            </CardHeader>
            <CardContent>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Achats, consommations IA et attributions manuelles partagent le meme
                ledger.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acheter des credits</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Rechargement one-shot via Stripe, sans abonnement recurrent.
            </p>
          </CardHeader>
          <CardContent
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {creditPackIds.map((packId) => {
              const pack = creditPacks[packId];

              return (
                <form
                  key={pack.id}
                  action="/credits/checkout"
                  method="POST"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "1rem",
                    display: "grid",
                    gap: "0.75rem",
                    padding: "1rem",
                  }}
                >
                  <input name="packId" type="hidden" value={pack.id} />
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <strong style={{ color: "#1A1A18", fontSize: "1.05rem" }}>
                      Pack {pack.label}
                    </strong>
                    <span style={{ color: "#6B6860" }}>
                      {formatCurrency(pack.priceCents)} TTC
                    </span>
                    <span style={{ color: "#6B6860" }}>{pack.credits} credits</span>
                  </div>
                  <Button type="submit">Acheter le pack {pack.label}</Button>
                </form>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique credits</CardTitle>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Lecture chronologique du ledger partage entre achats et consommations.
            </p>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "0.75rem" }}>
            {summary.history.length === 0 ? (
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Aucun mouvement pour le moment. Le premier achat apparaitra ici.
              </p>
            ) : (
              summary.history.map((entry) => {
                const details = resolveEntryDetails(entry);

                return (
                  <article
                    key={entry.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D9D4CA",
                      borderRadius: "1rem",
                      display: "grid",
                      gap: "0.65rem",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "start",
                        display: "flex",
                        gap: "0.75rem",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "grid", gap: "0.2rem" }}>
                        <strong style={{ color: "#1A1A18" }}>{details.title}</strong>
                        <span style={{ color: "#6B6860", fontSize: "0.95rem" }}>
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <span
                        style={{
                          backgroundColor:
                            entry.amount >= 0 ? "#E5EFE0" : "#F7E1DE",
                          borderRadius: "999px",
                          color: entry.amount >= 0 ? "#2F5233" : "#8A3A32",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          padding: "0.35rem 0.7rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.amount >= 0 ? "+" : ""}
                        {entry.amount} credits
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#6B6860",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <span>{details.badgeLabel}</span>
                      <span>Solde apres: {entry.balanceAfter} credits</span>
                      {details.amountLabel ? (
                        <span>Montant: {details.amountLabel}</span>
                      ) : null}
                      {entry.metadata.applicationId ? (
                        <Link
                          href="/candidatures"
                          style={{ color: "#2C2C2A", fontWeight: 600 }}
                        >
                          Voir la candidature liee
                        </Link>
                      ) : null}
                    </div>
                    {entry.note ? (
                      <p style={{ color: "#2C2C2A", lineHeight: 1.6, margin: 0 }}>
                        {entry.note}
                      </p>
                    ) : null}
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
