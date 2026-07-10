import React from "react";
import { cookies } from "next/headers";
import {
  AppShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@cvforge/ui";
import type {
  InAppNotification,
  NotificationPreferencesResponse,
} from "@cvforge/types";
import { getServerApiUrl } from "../auth-config";
import { getAppNavigation } from "../content";
import { requireSession } from "../auth/session";
import { NotificationBell } from "./notification-bell";
import { groupNotificationsByDay } from "./notification-groups";

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function NotificationArticle({
  notification,
}: {
  notification: InAppNotification;
}) {
  return (
    <article
      style={{
        border: "1px solid #D9D3C7",
        borderRadius: "1rem",
        display: "grid",
        gap: "0.85rem",
        padding: "1rem",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "grid", gap: "0.35rem" }}>
          <strong>{notification.title}</strong>
          <span style={{ color: "#6B6860", fontSize: "0.95rem" }}>
            {formatDate(notification.createdAt)}
          </span>
        </div>
        <Badge variant={notification.readAt ? "outline" : "success"}>
          {notification.readAt ? "Lue" : "Non lue"}
        </Badge>
      </div>

      <p style={{ lineHeight: 1.7, margin: 0 }}>{notification.message}</p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <Button asChild size="sm" variant="secondary">
          <a href={notification.linkHref}>Ouvrir l&apos;element lie</a>
        </Button>

        {!notification.readAt ? (
          <form action="/notifications/read" method="POST">
            <input name="notificationId" type="hidden" value={notification.id} />
            <Button size="sm" type="submit" variant="ghost">
              Marquer comme lue
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

async function fetchNotifications() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/notifications`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer les notifications.");
  }

  const payload = (await response.json()) as {
    notifications: InAppNotification[];
  };

  return payload.notifications;
}

async function fetchNotificationPreferences() {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);
  const response = await fetch(`${getServerApiUrl()}/notifications/preferences`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de recuperer les preferences de notification.");
  }

  return (await response.json()) as NotificationPreferencesResponse;
}

function resolveStatusMessage(
  error: string | undefined,
  updated: string | undefined,
) {
  if (updated && !error) {
    return {
      text:
        updated === "preferences"
          ? "Les preferences email ont ete enregistrees."
          : "La notification a ete marquee comme lue.",
      tone: "success" as const,
    };
  }

  if (!error) {
    return null;
  }

  return {
    text:
      error === "notification_missing"
        ? "La notification cible est manquante."
        : error === "preferences_update_failed"
          ? "La mise a jour des preferences a echoue."
        : "La mise a jour de la notification a echoue.",
    tone: "error" as const,
  };
}

type NotificationsPageProps = {
  searchParams?: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function NotificationsPage(props: NotificationsPageProps) {
  const session = await requireSession();
  const [notifications, preferencesResponse] = await Promise.all([
    fetchNotifications(),
    fetchNotificationPreferences(),
  ]);
  const resolvedSearchParams = await props?.searchParams;
  const statusMessage = resolveStatusMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.updated,
  );
  const unreadCount = notifications.filter((notification) => !notification.readAt)
    .length;
  const daySections = groupNotificationsByDay(notifications, new Date());
  const emailPreferences = preferencesResponse.preferences.email;
  const providerLabel = preferencesResponse.provider ?? "SMTP";

  return (
    <AppShell
      breadcrumb="Notifications"
      description="Centre in-app pour les rappels de candidature et les notifications produit."
      headerAccessory={<NotificationBell />}
      navigation={getAppNavigation("/notifications", session.role)}
      title="Centre de notifications"
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
              <CardTitle>Compte</CardTitle>
            </CardHeader>
            <CardContent style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ color: "#6B6860" }}>{session.email}</span>
              <strong aria-live="polite" role="status">
                {unreadCount} notification(s) non lue(s)
              </strong>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rappels actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Les relances J+7 apparaissent ici des qu&apos;une candidature reste
                au statut &quot;envoyee&quot; sans retour.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Fil d&apos;activite</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1.25rem" }}>
            {daySections.length === 0 ? (
              <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                Aucune notification in-app pour le moment.
              </p>
            ) : (
              daySections.map((section) => (
                <div
                  key={section.bucket}
                  style={{ display: "grid", gap: "0.75rem" }}
                >
                  <h3
                    style={{
                      color: "#6B6860",
                      fontSize: "0.8rem",
                      letterSpacing: "0.06em",
                      margin: 0,
                      textTransform: "uppercase",
                    }}
                  >
                    {section.label}
                  </h3>
                  <div style={{ display: "grid", gap: "0.85rem" }}>
                    {section.notifications.map((notification) => (
                      <NotificationArticle
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences email</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "0.75rem" }}>
            <p style={{ color: "#6B6860", lineHeight: 1.5, margin: 0 }}>
              Provider configure: <strong>{providerLabel}</strong> — Etat:{" "}
              <strong>
                {preferencesResponse.emailDeliveryReady ? "pret" : "non configure"}
              </strong>
            </p>
            <form
              action="/notifications/preferences"
              method="POST"
              style={{ display: "grid", gap: "0.6rem" }}
            >
              <label
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.6rem",
                }}
              >
                <input
                  defaultChecked={emailPreferences.applicationFollowUp}
                  name="applicationFollowUp"
                  type="checkbox"
                />
                <span>
                  <strong>Relance candidature J+7</strong>
                  <span style={{ color: "#6B6860", fontSize: "0.85rem" }}>
                    {" "}
                    — email a J+7 sans reponse
                  </span>
                </span>
              </label>

              <label
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.6rem",
                }}
              >
                <input
                  defaultChecked={emailPreferences.creditPurchaseConfirmed}
                  name="creditPurchaseConfirmed"
                  type="checkbox"
                />
                <span>
                  <strong>Achat de credits confirme</strong>
                  <span style={{ color: "#6B6860", fontSize: "0.85rem" }}>
                    {" "}
                    — confirmation apres webhook Stripe
                  </span>
                </span>
              </label>

              <div>
                <Button size="sm" type="submit">
                  Enregistrer mes preferences
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
