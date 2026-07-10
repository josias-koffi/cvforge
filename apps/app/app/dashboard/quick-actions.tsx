import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import Link from "next/link";

const LINK_CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D9D4CA",
  borderRadius: "1rem",
  color: "#2C2C2A",
  display: "grid",
  gap: "0.5rem",
  padding: "1rem",
  textDecoration: "none",
};

const QUICK_ACTIONS = [
  {
    description: "Importer une offre puis lancer le pipeline CVforge.",
    href: "/candidatures",
    title: "Nouvelle candidature",
  },
  {
    description: "Reprendre les entretiens planifiés et l'entrainement vocal.",
    href: "/interview",
    title: "Commencer un entretien",
  },
  {
    description: "Recharger le solde ou consulter le ledger complet.",
    href: "/credits",
    title: "Acheter des crédits",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès rapides</CardTitle>
      </CardHeader>
      <CardContent
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {QUICK_ACTIONS.map((action) => (
          <Link href={action.href} key={action.href} style={LINK_CARD_STYLE}>
            <strong>{action.title}</strong>
            <span style={{ color: "#6B6860" }}>{action.description}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
