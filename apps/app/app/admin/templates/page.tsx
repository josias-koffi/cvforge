import React from "react";
import { cookies } from "next/headers";
import { AppShell, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CV_PREVIEW_FIXTURE, Input, Label, LETTER_PREVIEW_FIXTURE, PaperStyles } from "@cvforge/ui";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER, type TemplateAnalyticsSummary, type TemplateRecord } from "@cvforge/types";
import { TemplateLayoutEditor } from "./template-layout-editor";
import {
  TemplateCard,
  TemplatePreview,
  errorMessage,
  kindLabel,
} from "./template-page-components";
import { getAppNavigation } from "../../content";
import { getServerApiUrl } from "../../auth-config";
import { requireAdminSession } from "../../auth/session";
import { NotificationBell } from "../../notifications/notification-bell";

const PREDEFINED_CATEGORIES = ["ATS", "Moderne", "Minimaliste", "Créatif"] as const;

type TemplatePageProps = {
  searchParams?: Promise<{
    error?: string;
    filterActive?: string;
    filterCategory?: string;
    filterKind?: string;
    saved?: string;
    templateId?: string;
  }>;
};

type TemplatesResponse = {
  templates: TemplateRecord[];
};

type TemplateAnalyticsResponse = {
  csv: string;
  summary: TemplateAnalyticsSummary;
};

function serializeLayout(layout: TemplateRecord["layout"]) {
  return JSON.stringify(layout, null, 2);
}

async function fetchTemplates() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const response = await fetch(`${getServerApiUrl()}/templates`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les templates admin.");
  }

  return (await response.json()) as TemplatesResponse;
}

async function fetchTemplateAnalytics() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const response = await fetch(`${getServerApiUrl()}/templates/analytics`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!response.ok) {
    throw new Error("Impossible de charger les analytics templates.");
  }

  return (await response.json()) as TemplateAnalyticsResponse;
}

export default async function AdminTemplatesPage({
  searchParams,
}: TemplatePageProps) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await searchParams;
  const [{ templates }, analytics] = await Promise.all([
    fetchTemplates(),
    fetchTemplateAnalytics(),
  ]);

  const filterKind = resolvedSearchParams?.filterKind ?? "";
  const filterActive = resolvedSearchParams?.filterActive ?? "";
  const filterCategory = resolvedSearchParams?.filterCategory ?? "";

  const filteredTemplates = templates.filter((template) => {
    if (filterKind && template.kind !== filterKind) return false;
    if (filterActive === "active" && !template.active) return false;
    if (filterActive === "inactive" && template.active) return false;
    if (filterCategory && !template.categories.includes(filterCategory)) return false;

    return true;
  });

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === resolvedSearchParams?.templateId) ??
    templates.find((template) => template.id === resolvedSearchParams?.templateId) ??
    filteredTemplates[0] ??
    templates[0];

  if (!selectedTemplate) {
    throw new Error("Aucun template ATS seed n'est disponible.");
  }

  const allCategories = Array.from(
    new Set(templates.flatMap((template) => template.categories)),
  ).sort();

  const filterBase = new URL(`/admin/templates`, "http://localhost");

  if (resolvedSearchParams?.templateId) {
    filterBase.searchParams.set("templateId", resolvedSearchParams.templateId);
  }

  return (
    <>
      <PaperStyles />
      <AppShell
        breadcrumb="Admin · Templates"
        description="Creation, edition et aperçu des templates CV ATS et LM ATS."
        headerAccessory={<NotificationBell />}
        navigation={getAppNavigation("/admin/templates", session.role)}
        title="Templates admin"
        userEmail={session.email}
        userRole={session.role}
      >
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "minmax(0, 20rem) minmax(0, 1fr)",
          }}
        >
          <aside style={{ display: "grid", gap: "1rem" }}>
            <Card>
              <CardHeader>
                <CardTitle>Bibliothèque</CardTitle>
                <CardDescription>
                  {templates.filter((t) => t.kind === TEMPLATE_KIND_CV).length} CV ·{" "}
                  {templates.filter((t) => t.kind === TEMPLATE_KIND_LETTER).length} LM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    <a
                      href={`/admin/templates${resolvedSearchParams?.templateId ? `?templateId=${encodeURIComponent(resolvedSearchParams.templateId)}` : ""}`}
                      style={{
                        border: "1px solid",
                        borderColor: !filterKind && !filterActive && !filterCategory ? "#2C2C2A" : "#D9D4CA",
                        borderRadius: "999px",
                        color: !filterKind && !filterActive && !filterCategory ? "#2C2C2A" : "#6B6860",
                        fontSize: "0.8125rem",
                        padding: "0.2rem 0.65rem",
                        textDecoration: "none",
                      }}
                    >
                      Tous
                    </a>
                    {[TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER].map((kind) => {
                      const params = new URL(filterBase.toString());

                      params.searchParams.set("filterKind", kind);

                      return (
                        <a
                          key={kind}
                          href={params.pathname + params.search}
                          style={{
                            border: "1px solid",
                            borderColor: filterKind === kind ? "#2C2C2A" : "#D9D4CA",
                            borderRadius: "999px",
                            color: filterKind === kind ? "#2C2C2A" : "#6B6860",
                            fontSize: "0.8125rem",
                            padding: "0.2rem 0.65rem",
                            textDecoration: "none",
                          }}
                        >
                          {kindLabel(kind)}
                        </a>
                      );
                    })}
                    {[
                      { label: "Actifs", value: "active" },
                      { label: "Inactifs", value: "inactive" },
                    ].map(({ label, value }) => {
                      const params = new URL(filterBase.toString());

                      params.searchParams.set("filterActive", value);

                      return (
                        <a
                          key={value}
                          href={params.pathname + params.search}
                          style={{
                            border: "1px solid",
                            borderColor: filterActive === value ? "#2C2C2A" : "#D9D4CA",
                            borderRadius: "999px",
                            color: filterActive === value ? "#2C2C2A" : "#6B6860",
                            fontSize: "0.8125rem",
                            padding: "0.2rem 0.65rem",
                            textDecoration: "none",
                          }}
                        >
                          {label}
                        </a>
                      );
                    })}
                    {allCategories.map((cat) => {
                      const params = new URL(filterBase.toString());

                      params.searchParams.set("filterCategory", cat);

                      return (
                        <a
                          key={cat}
                          href={params.pathname + params.search}
                          style={{
                            border: "1px solid",
                            borderColor: filterCategory === cat ? "#2C2C2A" : "#D9D4CA",
                            borderRadius: "999px",
                            color: filterCategory === cat ? "#2C2C2A" : "#6B6860",
                            fontSize: "0.8125rem",
                            padding: "0.2rem 0.65rem",
                            textDecoration: "none",
                          }}
                        >
                          {cat}
                        </a>
                      );
                    })}
                  </div>

                  {filteredTemplates.length === 0 ? (
                    <p style={{ color: "#8A7F71", fontSize: "0.875rem", margin: 0 }}>
                      Aucun template ne correspond aux filtres.
                    </p>
                  ) : (
                    filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={template.id === selectedTemplate.id}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Volume réel des documents générés et templates les plus utilisés.
                </CardDescription>
              </CardHeader>
              <CardContent style={{ display: "grid", gap: "0.875rem" }}>
                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {[
                    { label: "Templates", value: analytics.summary.totalTemplates },
                    { label: "Actifs", value: analytics.summary.activeTemplates },
                    { label: "CV générés", value: analytics.summary.generatedCvCount },
                    { label: "LM générées", value: analytics.summary.generatedLetterCount },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        backgroundColor: "#FAFAF7",
                        border: "1px solid #E7E0D3",
                        borderRadius: "0.875rem",
                        padding: "0.75rem",
                      }}
                    >
                      <div style={{ color: "#6B6860", fontSize: "0.8125rem" }}>{item.label}</div>
                      <strong style={{ fontSize: "1.125rem" }}>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <strong>Top templates</strong>
                    <a
                      href="/admin/templates/export"
                      style={{ color: "#2C2C2A", fontSize: "0.875rem" }}
                    >
                      Export CSV
                    </a>
                  </div>
                  {analytics.summary.topTemplates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.75rem",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "grid", gap: "0.1rem" }}>
                        <span>{template.name}</span>
                        <span style={{ color: "#6B6860", fontSize: "0.8125rem" }}>
                          {kindLabel(template.kind)} · {template.locale.toUpperCase()}
                        </span>
                      </div>
                      <strong>{template.usageCount}</strong>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session admin</CardTitle>
                <CardDescription>
                  {session.email} · {session.role}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
                  Les templates sont stockes comme JSON structure, prets pour
                  une persistance PostgreSQL dans le modele cible.
                </p>
              </CardContent>
            </Card>
          </aside>

          <div style={{ display: "grid", gap: "1rem" }}>
            {resolvedSearchParams?.saved ? (
              <p style={{ color: "#4A7C59", margin: 0 }}>
                Template enregistré avec succès.
              </p>
            ) : null}
            {resolvedSearchParams?.error ? (
              <p style={{ color: "#C0392B", margin: 0 }}>
                {errorMessage(resolvedSearchParams.error)}
              </p>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Creer un template</CardTitle>
                <CardDescription>
                  Demarrer un nouveau layout vide sans repartir d&apos;une copie.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action="/admin/templates/save"
                  method="post"
                  style={{ display: "grid", gap: "1rem" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="create-name">Nom</Label>
                      <Input
                        id="create-name"
                        name="name"
                        defaultValue="Nouveau template ATS"
                      />
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="create-kind">Type</Label>
                      <select
                        id="create-kind"
                        name="kind"
                        defaultValue={TEMPLATE_KIND_CV}
                        style={{
                          border: "1px solid #D9D4CA",
                          borderRadius: "0.875rem",
                          minHeight: "2.75rem",
                          padding: "0.75rem",
                        }}
                      >
                        <option value={TEMPLATE_KIND_CV}>CV</option>
                        <option value={TEMPLATE_KIND_LETTER}>LM</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="create-locale">Langue</Label>
                      <select
                        id="create-locale"
                        name="locale"
                        defaultValue="fr"
                        style={{
                          border: "1px solid #D9D4CA",
                          borderRadius: "0.875rem",
                          minHeight: "2.75rem",
                          padding: "0.75rem",
                        }}
                      >
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="create-categories">
                        Catégories
                        <span style={{ color: "#8A7F71", fontWeight: 400, marginLeft: "0.4rem" }}>
                          (séparées par virgule)
                        </span>
                      </Label>
                      <Input
                        id="create-categories"
                        name="categories"
                        defaultValue="ATS"
                        placeholder={PREDEFINED_CATEGORIES.join(", ")}
                      />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.2rem" }}>
                        {PREDEFINED_CATEGORIES.map((cat) => (
                          <span
                            key={cat}
                            style={{
                              border: "1px solid #D9D4CA",
                              borderRadius: "999px",
                              color: "#6B6860",
                              cursor: "default",
                              fontSize: "0.75rem",
                              padding: "0.1rem 0.5rem",
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <label
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <input name="active" type="checkbox" defaultChecked />
                      Template visible
                    </label>
                    <label
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <input name="isDefault" type="checkbox" />
                      Template par defaut
                    </label>
                  </div>
                  <input
                    name="layout"
                    type="hidden"
                    value={JSON.stringify({ content: [], root: { props: {} } })}
                  />
                  <Button type="submit">Creer le template</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editeur de layout</CardTitle>
                <CardDescription>
                  Modifier le template selectionne puis enregistrer la structure JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action="/admin/templates/save"
                  method="post"
                  style={{ display: "grid", gap: "1rem" }}
                >
                  <input name="templateId" type="hidden" value={selectedTemplate.id} />
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="name">Nom</Label>
                      <Input id="name" name="name" defaultValue={selectedTemplate.name} />
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="kind">Type</Label>
                      <select
                        id="kind"
                        name="kind"
                        defaultValue={selectedTemplate.kind}
                        disabled
                        style={{
                          border: "1px solid #D9D4CA",
                          borderRadius: "0.875rem",
                          minHeight: "2.75rem",
                          padding: "0.75rem",
                        }}
                      >
                        <option value={TEMPLATE_KIND_CV}>CV</option>
                        <option value={TEMPLATE_KIND_LETTER}>LM</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="locale">Langue</Label>
                      <select
                        id="locale"
                        name="locale"
                        defaultValue={selectedTemplate.locale}
                        style={{
                          border: "1px solid #D9D4CA",
                          borderRadius: "0.875rem",
                          minHeight: "2.75rem",
                          padding: "0.75rem",
                        }}
                      >
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                      </select>
                    </div>
                    <div style={{ display: "grid", gap: "0.35rem" }}>
                      <Label htmlFor="categories">
                        Catégories
                        <span style={{ color: "#8A7F71", fontWeight: 400, marginLeft: "0.4rem" }}>
                          (séparées par virgule)
                        </span>
                      </Label>
                      <Input
                        id="categories"
                        name="categories"
                        defaultValue={selectedTemplate.categories.join(", ")}
                        placeholder={PREDEFINED_CATEGORIES.join(", ")}
                      />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.2rem" }}>
                        {PREDEFINED_CATEGORIES.map((cat) => (
                          <span
                            key={cat}
                            style={{
                              border: "1px solid",
                              borderColor: selectedTemplate.categories.includes(cat) ? "#2C2C2A" : "#D9D4CA",
                              borderRadius: "999px",
                              color: selectedTemplate.categories.includes(cat) ? "#2C2C2A" : "#8A7F71",
                              cursor: "default",
                              fontSize: "0.75rem",
                              fontWeight: selectedTemplate.categories.includes(cat) ? 600 : 400,
                              padding: "0.1rem 0.5rem",
                            }}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    <label
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        name="active"
                        type="checkbox"
                        defaultChecked={selectedTemplate.active}
                      />
                      Template visible
                    </label>
                    <label
                      style={{
                        alignItems: "center",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        name="isDefault"
                        type="checkbox"
                        defaultChecked={selectedTemplate.isDefault}
                      />
                      Template par defaut
                    </label>
                  </div>

                  <input
                    name="layout"
                    type="hidden"
                    value={serializeLayout(selectedTemplate.layout)}
                  />

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Button type="submit">Enregistrer les métadonnées</Button>
                  </div>
                </form>

                <div style={{ marginTop: "1.5rem" }}>
                  <p style={{ color: "#6B6860", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
                    Assemblez les blocs ci-dessous puis publiez pour enregistrer le layout.
                  </p>
                  <TemplateLayoutEditor
                    templateId={selectedTemplate.id}
                    kind={selectedTemplate.kind}
                    initialData={selectedTemplate.layout}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aperçu live</CardTitle>
                <CardDescription>
                  Rendu avec données fictives injectées — tous les blocs du template sont peuplés.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatePreview
                  template={selectedTemplate}
                  previewContent={
                    selectedTemplate.kind === TEMPLATE_KIND_LETTER
                      ? LETTER_PREVIEW_FIXTURE
                      : CV_PREVIEW_FIXTURE
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </>
  );
}
