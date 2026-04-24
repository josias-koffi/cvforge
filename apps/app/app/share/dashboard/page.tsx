import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import { getAppUrl } from "../../auth-config";
import {
  buildShareLegend,
  parseDashboardShareCardData,
} from "../../dashboard/share-card-content";

type ShareDashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveSearchParams(
  searchParams: ShareDashboardPageProps["searchParams"],
) {
  if (!searchParams) {
    return {};
  }

  return await searchParams;
}

export async function generateMetadata(
  props: ShareDashboardPageProps,
): Promise<Metadata> {
  const params = await resolveSearchParams(props.searchParams);
  const data = parseDashboardShareCardData(params);
  const appUrl = getAppUrl();
  const query = new URLSearchParams({
    averageAtsScore:
      data.averageAtsScore === null ? "null" : String(data.averageAtsScore),
    averageInterviewScore:
      data.averageInterviewScore === null
        ? "null"
        : String(data.averageInterviewScore),
    generatedAt: data.generatedAt,
    interviewCount: String(data.interviewCount),
    offerCount: String(data.offerCount),
    responseRate: String(data.responseRate),
    totalApplications: String(data.totalApplications),
  }).toString();
  const shareUrl = `${appUrl}/share/dashboard?${query}`;
  const imageUrl = `${appUrl}/share/dashboard/og?${query}`;
  const description = buildShareLegend(data);

  return {
    description,
    openGraph: {
      description,
      images: [
        {
          alt: "Carte partageable CVforge",
          height: 627,
          url: imageUrl,
          width: 1200,
        },
      ],
      title: "CVforge - tableau de bord candidature",
      type: "website",
      url: shareUrl,
    },
    title: "CVforge - tableau de bord candidature",
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title: "CVforge - tableau de bord candidature",
    },
  };
}

export default async function ShareDashboardPage(props: ShareDashboardPageProps) {
  const params = await resolveSearchParams(props.searchParams);
  const data = parseDashboardShareCardData(params);
  const description = buildShareLegend(data);

  return (
    <main
      style={{
        display: "grid",
        justifyItems: "center",
        minHeight: "100vh",
        padding: "2rem 1rem",
      }}
    >
      <Card style={{ maxWidth: "720px", width: "100%" }}>
        <CardHeader>
          <CardTitle>Carte partageable CVforge</CardTitle>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Cette page publique existe pour fournir un apercu propre lors du partage
            sur LinkedIn et les autres plateformes qui lisent les metadonnees Open Graph.
          </p>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <p style={{ color: "#2C2C2A", lineHeight: 1.7, margin: 0 }}>{description}</p>
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            }}
          >
            <Metric label="Candidatures" value={String(data.totalApplications)} />
            <Metric label="Taux de reponse" value={`${data.responseRate}%`} />
            <Metric label="Entretiens" value={String(data.interviewCount)} />
            <Metric label="Offres" value={String(data.offerCount)} />
          </div>
          <Link href="/dashboard" style={{ color: "#2C2C2A" }}>
            Retourner au tableau de bord
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D4CA",
        borderRadius: "1rem",
        display: "grid",
        gap: "0.35rem",
        padding: "1rem",
      }}
    >
      <span style={{ color: "#6B6860" }}>{label}</span>
      <strong style={{ color: "#1A1A18", fontSize: "1.3rem" }}>{value}</strong>
    </div>
  );
}
