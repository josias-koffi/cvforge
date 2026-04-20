import React from "react";
import { cookies } from "next/headers";
import { AppShell, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PaperStyles, Textarea, documentBlockRegistry } from "@cvforge/ui";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER, type TemplateRecord } from "@cvforge/types";
import { getAppNavigation } from "../../content";
import { getServerApiUrl } from "../../auth-config";
import { requireAdminSession } from "../../auth/session";

type TemplatePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    templateId?: string;
  }>;
};

type TemplatesResponse = {
  templates: TemplateRecord[];
};

function kindLabel(kind: TemplateRecord["kind"]) {
  return kind === TEMPLATE_KIND_LETTER ? "Lettre de motivation" : "CV";
}

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

function TemplatePreview({ template }: { template: TemplateRecord }) {
  return (
    <div
      style={{
        backgroundColor: "#FBF8F2",
        border: "1px solid #D9D4CA",
        borderRadius: "1rem",
        display: "grid",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {template.layout.blocks.map((block) => {
        const definition =
          documentBlockRegistry[
            block.name as keyof typeof documentBlockRegistry
          ];

        if (!definition) {
          return (
            <div key={block.id} style={{ color: "#8A7F71" }}>
              {block.name} introuvable dans le registre partage.
            </div>
          );
        }

        const Component = definition.component as React.ElementType;

        return (
          <section
            key={block.id}
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EEE7DC",
              borderRadius: "0.75rem",
              padding: "0.875rem",
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <strong>{definition.label}</strong>
              <span style={{ color: "#8A7F71", fontSize: "0.875rem" }}>
                {block.name}
              </span>
            </div>
            <Component {...definition.defaultProps} {...block.props} />
          </section>
        );
      })}
    </div>
  );
}

export default async function AdminTemplatesPage({
  searchParams,
}: TemplatePageProps) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await searchParams;
  const { templates } = await fetchTemplates();
  const selectedTemplate =
    templates.find((template) => template.id === resolvedSearchParams?.templateId) ??
    templates[0];

  if (!selectedTemplate) {
    throw new Error("Aucun template ATS seed n'est disponible.");
  }

  return (
    <>
      <PaperStyles />
      <AppShell
        title="Templates admin"
        description="Creation, edition et aperçu des templates CV ATS et LM ATS."
        navigation={getAppNavigation("/admin/templates")}
      >
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "minmax(0, 18rem) minmax(0, 1fr)",
          }}
        >
          <aside style={{ display: "grid", gap: "1rem" }}>
            <Card>
              <CardHeader>
                <CardTitle>Bibliotheque</CardTitle>
                <CardDescription>
                  {templates.filter((template) => template.kind === TEMPLATE_KIND_CV).length} CV ATS et{" "}
                  {templates.filter((template) => template.kind === TEMPLATE_KIND_LETTER).length} LM ATS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {templates.map((template) => (
                    <React.Fragment key={template.id}>
                      <a
                        href={`/admin/templates?templateId=${encodeURIComponent(template.id)}`}
                        style={{
                          backgroundColor:
                            template.id === selectedTemplate.id ? "#F6EFE4" : "#FFFFFF",
                          border: "1px solid #D9D4CA",
                          borderRadius: "0.875rem",
                          color: "#1A1A18",
                          display: "grid",
                          gap: "0.35rem",
                          padding: "0.875rem",
                          textDecoration: "none",
                        }}
                      >
                        <div
                          style={{
                            alignItems: "center",
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "space-between",
                          }}
                        >
                          <strong>{template.name}</strong>
                          {template.isDefault ? <Badge>Defaut</Badge> : null}
                        </div>
                        <span style={{ color: "#6B6860" }}>{kindLabel(template.kind)}</span>
                        <span style={{ color: "#8A7F71", fontSize: "0.875rem" }}>
                          {template.active ? "Visible aux utilisateurs" : "Masque aux utilisateurs"}
                        </span>
                      </a>
                      <form action="/admin/templates/duplicate" method="post">
                        <input name="templateId" type="hidden" value={template.id} />
                        <Button type="submit" variant="ghost">
                          Dupliquer
                        </Button>
                      </form>
                    </React.Fragment>
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
            <Card>
              <CardHeader>
                <CardTitle>Creer un template</CardTitle>
                <CardDescription>
                  Demarrer un nouveau JSON Puck sans repartir d&apos;une copie.
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
                      <Label htmlFor="create-categories">Categories</Label>
                      <Input
                        id="create-categories"
                        name="categories"
                        defaultValue="ATS"
                      />
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
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <Label htmlFor="create-layout">Layout JSON</Label>
                    <Textarea
                      id="create-layout"
                      name="layout"
                      defaultValue={JSON.stringify({ blocks: [] }, null, 2)}
                      rows={8}
                    />
                  </div>
                  <Button type="submit">Creer le template</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editeur Puck</CardTitle>
                <CardDescription>
                  Modifier le template selectionne puis enregistrer la structure JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedSearchParams?.saved ? (
                  <p style={{ color: "#2F6B3A", marginTop: 0 }}>
                    Template enregistre avec succes.
                  </p>
                ) : null}
                {resolvedSearchParams?.error ? (
                  <p style={{ color: "#A13D2D", marginTop: 0 }}>
                    Une erreur est survenue pendant la sauvegarde.
                  </p>
                ) : null}

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
                      <Label htmlFor="categories">Categories</Label>
                      <Input
                        id="categories"
                        name="categories"
                        defaultValue={selectedTemplate.categories.join(", ")}
                      />
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

                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    <Label htmlFor="layout">Layout JSON</Label>
                    <Textarea
                      id="layout"
                      name="layout"
                      defaultValue={serializeLayout(selectedTemplate.layout)}
                      rows={18}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <Button type="submit">Enregistrer le template</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Apercu live</CardTitle>
                <CardDescription>
                  Rendu des blocs partagés avec le registre CV/LM.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatePreview template={selectedTemplate} />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </>
  );
}
