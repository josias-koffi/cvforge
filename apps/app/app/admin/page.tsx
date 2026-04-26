import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@cvforge/ui";
import { getAppNavigation } from "../content";
import { getServerApiUrl } from "../auth-config";
import { requireAdminSession } from "../auth/session";
import { NotificationBell } from "../notifications/notification-bell";

type AdminPageProps = {
  searchParams?: Promise<{
    error?: string;
    granted?: string;
    page?: string;
    query?: string;
    role?: string;
  }>;
};

type AdminUsersResponse = {
  filters: {
    query: string;
    role: "admin" | "all" | "user";
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  requestedBy: string;
  users: Array<{
    balance: number;
    consent: {
      acceptedAt: string;
      source: "invitation" | "passwordless";
      version: string;
    } | null;
    email: string;
    lastActivityAt: string | null;
    lastManualGrant: {
      adminEmail: string | null;
      amount: number;
      createdAt: string;
      note: string | null;
    } | null;
    ledgerEntryCount: number;
    role: "admin" | "user";
  }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Aucune activite";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function fetchAdminUsers(searchParams?: Awaited<AdminPageProps["searchParams"]>) {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const url = new URL(`${getServerApiUrl()}/credits/admin/users`);

  if (searchParams?.page) {
    url.searchParams.set("page", searchParams.page);
  }

  if (searchParams?.query) {
    url.searchParams.set("query", searchParams.query);
  }

  if (searchParams?.role) {
    url.searchParams.set("role", searchParams.role);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger la liste admin des utilisateurs.");
  }

  return (await response.json()) as AdminUsersResponse;
}

function buildPageHref({
  page,
  query,
  role,
}: {
  page: number;
  query: string;
  role: string;
}) {
  const url = new URL("/admin", "http://localhost");

  if (page > 1) {
    url.searchParams.set("page", String(page));
  }

  if (query) {
    url.searchParams.set("query", query);
  }

  if (role && role !== "all") {
    url.searchParams.set("role", role);
  }

  return `${url.pathname}${url.search}`;
}

function resolveStatusMessage(
  error: string | undefined,
  granted: string | undefined,
) {
  if (granted && !error) {
    return {
      tone: "success" as const,
      text: `Attribution de credits enregistree pour ${granted}.`,
    };
  }

  if (!error) {
    return null;
  }

  switch (error) {
    case "user_missing":
      return {
        tone: "error" as const,
        text: "Impossible d'attribuer des credits sans utilisateur cible.",
      };
    case "credits_invalid":
      return {
        tone: "error" as const,
        text: "Le nombre de credits doit etre un entier positif.",
      };
    default:
      return {
        tone: "error" as const,
        text: "L'attribution manuelle a echoue. Verifiez la note obligatoire puis recommencez.",
      };
  }
}

export default async function AdminPage(props: AdminPageProps) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await props?.searchParams;
  const adminUsers = await fetchAdminUsers(resolvedSearchParams);
  const statusMessage = resolveStatusMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.granted,
  );

  return (
    <AppShell
      breadcrumb="Admin"
      description="Pilotage des utilisateurs, credits et acces admin depuis un registre unique."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/admin", session.role)}
      title="Espace admin"
      userEmail={session.email}
      userRole={session.role}
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        {statusMessage ? (
          <Card>
            <CardContent
              style={{
                backgroundColor:
                  statusMessage.tone === "success" ? "#E7F3E8" : "#FDE8E6",
                borderRadius: "1rem",
                color: statusMessage.tone === "success" ? "#245135" : "#7A271A",
                padding: "1rem 1.25rem",
              }}
            >
              <p style={{ lineHeight: 1.6, margin: 0 }}>{statusMessage.text}</p>
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
              <CardTitle>Session admin</CardTitle>
            </CardHeader>
            <CardContent style={{ display: "grid", gap: "0.4rem" }}>
              <span style={{ color: "#6B6860" }}>{session.email}</span>
              <strong>{session.role}</strong>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{adminUsers.pagination.totalItems}</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Utilisateurs correspondant aux filtres courants.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Chaque attribution manuelle entre dans le ledger avec note et admin
                auteur.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtres utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action="/admin"
              method="GET"
              style={{
                alignItems: "end",
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Label htmlFor="query">Recherche email</Label>
                <Input
                  defaultValue={adminUsers.filters.query}
                  id="query"
                  name="query"
                  placeholder="user@example.com"
                  type="search"
                />
              </div>

              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Label htmlFor="role">Role</Label>
                <select
                  defaultValue={adminUsers.filters.role}
                  id="role"
                  name="role"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #D9D4CA",
                    borderRadius: "0.85rem",
                    minHeight: "2.75rem",
                    padding: "0.75rem 0.9rem",
                  }}
                >
                  <option value="all">Tous les roles</option>
                  <option value="admin">Admins</option>
                  <option value="user">Utilisateurs</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Button type="submit">Appliquer</Button>
                <Button asChild variant="secondary">
                  <Link href="/admin">Reinitialiser</Link>
                </Button>
                <Button asChild variant="secondary">
                  <a href="/admin/templates">Ouvrir les templates</a>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {adminUsers.users.map((user) => (
            <Card key={user.email}>
              <CardHeader
                style={{
                  alignItems: "start",
                  display: "flex",
                  flexDirection: "row",
                  gap: "1rem",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "grid", gap: "0.35rem" }}>
                  <CardTitle>{user.email}</CardTitle>
                  <p style={{ color: "#6B6860", lineHeight: 1.5, margin: 0 }}>
                    Role {user.role} · {user.balance} credits · {user.ledgerEntryCount}{" "}
                    mouvement{user.ledgerEntryCount > 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: user.role === "admin" ? "#EADFCB" : "#F2F0EB",
                    borderRadius: "999px",
                    color: "#4F463A",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    padding: "0.35rem 0.7rem",
                  }}
                >
                  {user.role === "admin" ? "Admin" : "Utilisateur"}
                </span>
              </CardHeader>
              <CardContent
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
                }}
              >
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div
                    style={{
                      backgroundColor: "#FAFAF7",
                      border: "1px solid #E5DED2",
                      borderRadius: "0.9rem",
                      display: "grid",
                      gap: "0.5rem",
                      padding: "1rem",
                    }}
                  >
                    <strong>Activite</strong>
                    <span style={{ color: "#6B6860" }}>
                      Derniere activite: {formatDate(user.lastActivityAt)}
                    </span>
                    <span style={{ color: "#6B6860" }}>
                      Consentement:{" "}
                      {user.consent
                        ? `${user.consent.source} le ${formatDate(user.consent.acceptedAt)}`
                        : "non enregistre"}
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5DED2",
                      borderRadius: "0.9rem",
                      display: "grid",
                      gap: "0.5rem",
                      padding: "1rem",
                    }}
                  >
                    <strong>Derniere attribution manuelle</strong>
                    {user.lastManualGrant ? (
                      <>
                        <span style={{ color: "#6B6860" }}>
                          +{user.lastManualGrant.amount} credits le{" "}
                          {formatDate(user.lastManualGrant.createdAt)}
                        </span>
                        <span style={{ color: "#6B6860" }}>
                          Note: {user.lastManualGrant.note ?? "Aucune note"}
                        </span>
                        <span style={{ color: "#6B6860" }}>
                          Enregistre par {user.lastManualGrant.adminEmail ?? "admin inconnu"}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#6B6860" }}>
                        Aucune attribution manuelle loggee pour ce compte.
                      </span>
                    )}
                  </div>
                </div>

                <form
                  action="/admin/grant-credits"
                  method="POST"
                  style={{
                    backgroundColor: "#F8F5EF",
                    border: "1px solid #E5DED2",
                    borderRadius: "0.9rem",
                    display: "grid",
                    gap: "0.85rem",
                    padding: "1rem",
                  }}
                >
                  <input name="page" type="hidden" value={String(adminUsers.pagination.page)} />
                  <input name="query" type="hidden" value={adminUsers.filters.query} />
                  <input name="role" type="hidden" value={adminUsers.filters.role} />
                  <input name="userEmail" type="hidden" value={user.email} />

                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    <Label htmlFor={`credits-${user.email}`}>Credits a attribuer</Label>
                    <Input
                      id={`credits-${user.email}`}
                      min={1}
                      name="credits"
                      required
                      type="number"
                    />
                  </div>

                  <div style={{ display: "grid", gap: "0.4rem" }}>
                    <Label htmlFor={`note-${user.email}`}>Note obligatoire</Label>
                    <textarea
                      id={`note-${user.email}`}
                      name="note"
                      required
                      rows={4}
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #D9D4CA",
                        borderRadius: "0.85rem",
                        padding: "0.75rem 0.9rem",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <Button type="submit">Attribuer des credits</Button>
                </form>
              </CardContent>
            </Card>
          ))}

          {adminUsers.users.length === 0 ? (
            <Card>
              <CardContent style={{ padding: "1.25rem" }}>
                <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                  Aucun utilisateur ne correspond aux filtres courants.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Page {adminUsers.pagination.page} sur {adminUsers.pagination.totalPages}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button
              asChild
              disabled={adminUsers.pagination.page <= 1}
              variant="secondary"
            >
              <Link
                aria-disabled={adminUsers.pagination.page <= 1}
                href={buildPageHref({
                  page: Math.max(1, adminUsers.pagination.page - 1),
                  query: adminUsers.filters.query,
                  role: adminUsers.filters.role,
                })}
              >
                Page precedente
              </Link>
            </Button>
            <Button
              asChild
              disabled={
                adminUsers.pagination.page >= adminUsers.pagination.totalPages
              }
              variant="secondary"
            >
              <Link
                aria-disabled={
                  adminUsers.pagination.page >= adminUsers.pagination.totalPages
                }
                href={buildPageHref({
                  page: Math.min(
                    adminUsers.pagination.totalPages,
                    adminUsers.pagination.page + 1,
                  ),
                  query: adminUsers.filters.query,
                  role: adminUsers.filters.role,
                })}
              >
                Page suivante
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
