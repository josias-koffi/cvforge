import React from "react";
import { Badge, Button, documentBlockRegistry } from "@cvforge/ui";
import {
  TEMPLATE_KIND_LETTER,
  type CVDocumentContent,
  type LetterDocumentContent,
  type TemplateRecord,
} from "@cvforge/types";
import { DeleteForm } from "./delete-form";

export function kindLabel(kind: TemplateRecord["kind"]) {
  return kind === TEMPLATE_KIND_LETTER ? "Lettre de motivation" : "CV";
}

type BlockInstance = { id: string; name: string; props: Record<string, unknown> };
type ContentItem = TemplateRecord["layout"]["content"][number];

function resolveBlockInstances(
  item: ContentItem,
  itemIndex: number,
  previewContent: CVDocumentContent | LetterDocumentContent,
): BlockInstance[] {
  const id = String(item.props.id ?? itemIndex);
  const name = item.type;
  const cv = previewContent as CVDocumentContent;
  const letter = previewContent as LetterDocumentContent;

  switch (name) {
    case "CVHeader":
      return [{ id, name, props: cv.candidate as unknown as Record<string, unknown> }];
    case "SummaryBlock":
      return [{ id, name, props: { summary: cv.candidate.summary } }];
    case "ExperienceItem":
      return (cv.experiences ?? []).map((exp, i) => ({
        id: `${id}-${i}`,
        name,
        props: exp as unknown as Record<string, unknown>,
      }));
    case "EducationItem":
      return (cv.education ?? []).map((edu, i) => ({
        id: `${id}-${i}`,
        name,
        props: edu as unknown as Record<string, unknown>,
      }));
    case "SkillsList":
      return [
        {
          id,
          name,
          props: {
            hardSkills: cv.skills?.hard ?? [],
            softSkills: cv.skills?.soft ?? [],
          },
        },
      ];
    case "CertificationItem":
      return (cv.certifications ?? []).map((cert, i) => ({
        id: `${id}-${i}`,
        name,
        props: cert as unknown as Record<string, unknown>,
      }));
    case "LanguageItem":
      return (cv.languages ?? []).map((lang, i) => ({
        id: `${id}-${i}`,
        name,
        props: lang as unknown as Record<string, unknown>,
      }));
    case "ProjectItem":
      return (cv.projects ?? []).map((proj, i) => ({
        id: `${id}-${i}`,
        name,
        props: proj as unknown as Record<string, unknown>,
      }));
    case "LMHeader":
      return [
        {
          id,
          name,
          props: {
            ...(letter.candidate as unknown as Record<string, unknown>),
            companyCity: letter.company?.city ?? "",
            companyName: letter.company?.name ?? "",
            date: letter.date ?? "",
            object: letter.object ?? "",
          },
        },
      ];
    case "LMBody":
      return [{ id, name, props: letter.body as unknown as Record<string, unknown> }];
    case "LMSignature":
      return [
        { id, name, props: letter.signature as unknown as Record<string, unknown> },
      ];
    default:
      return [{ id, name, props: { ...item.props } }];
  }
}

export function TemplatePreview({
  template,
  previewContent,
}: {
  previewContent?: CVDocumentContent | LetterDocumentContent;
  template: TemplateRecord;
}) {
  const instances = template.layout.content.flatMap((item, i) =>
    previewContent
      ? resolveBlockInstances(item, i, previewContent)
      : [{ id: String(item.props.id ?? i), name: item.type, props: { ...item.props } }],
  );

  return (
    <div>
      {previewContent ? (
        <p
          style={{
            color: "#6B6860",
            fontSize: "0.8125rem",
            fontStyle: "italic",
            margin: "0 0 0.75rem",
          }}
        >
          Données fictives injectées — aperçu du rendu visuel uniquement
        </p>
      ) : null}
      <div
        style={{
          backgroundColor: "#FAFAF7",
          border: "1px solid #D9D4CA",
          borderRadius: "1rem",
          display: "grid",
          fontFamily: '"EB Garamond", "Libre Baskerville", serif',
          gap: "1rem",
          maxWidth: "65ch",
          padding: "1.5rem",
        }}
      >
        {instances.map((instance) => {
          const definition =
            documentBlockRegistry[
              instance.name as keyof typeof documentBlockRegistry
            ];

          if (!definition) {
            return (
              <div key={instance.id} style={{ color: "#8A7F71" }}>
                {instance.name} introuvable dans le registre partage.
              </div>
            );
          }

          const Component = definition.component as React.ElementType;
          const mergedProps = previewContent
            ? instance.props
            : { ...definition.defaultProps, ...instance.props };

          return (
            <section
              key={instance.id}
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
                <strong style={{ fontFamily: "Inter, sans-serif", fontSize: "0.875rem" }}>
                  {definition.label}
                </strong>
                <span style={{ color: "#8A7F71", fontFamily: "Inter, sans-serif", fontSize: "0.8125rem" }}>
                  {instance.name}
                </span>
              </div>
              <Component {...mergedProps} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function TemplateCard({
  isSelected,
  template,
}: {
  isSelected: boolean;
  template: TemplateRecord;
}) {
  return (
    <div
      style={{
        backgroundColor: isSelected ? "#F6EFE4" : "#FFFFFF",
        border: "1px solid #D9D4CA",
        borderRadius: "0.875rem",
        display: "grid",
        gap: "0.5rem",
        opacity: template.active ? 1 : 0.65,
        padding: "0.875rem",
      }}
    >
      <a
        href={`/admin/templates?templateId=${encodeURIComponent(template.id)}`}
        style={{ color: "#1A1A18", textDecoration: "none" }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
          <strong style={{ lineHeight: 1.3 }}>{template.name}</strong>
          {template.isDefault ? (
            <Badge style={{ backgroundColor: "#C8A96E", color: "#1A1A18", flexShrink: 0 }}>
              Défaut
            </Badge>
          ) : null}
        </div>
        <div style={{ color: "#6B6860", fontSize: "0.875rem", marginTop: "0.15rem" }}>
          {kindLabel(template.kind)} · {template.active ? "Actif" : "Inactif"}
        </div>
      </a>

      {template.categories.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
          {template.categories.map((cat) => (
            <Badge key={cat} variant="outline" style={{ fontSize: "0.75rem" }}>
              {cat}
            </Badge>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.25rem" }}>
        <form action="/admin/templates/duplicate" method="post">
          <input name="templateId" type="hidden" value={template.id} />
          <Button type="submit" variant="ghost" style={{ fontSize: "0.8125rem", padding: "0.25rem 0.625rem" }}>
            Dupliquer
          </Button>
        </form>

        <form action="/admin/templates/toggle-active" method="post">
          <input name="templateId" type="hidden" value={template.id} />
          <input name="active" type="hidden" value={String(!template.active)} />
          <Button
            aria-label={template.active ? `Désactiver ${template.name}` : `Activer ${template.name}`}
            type="submit"
            variant="ghost"
            style={{ fontSize: "0.8125rem", padding: "0.25rem 0.625rem" }}
          >
            {template.active ? "Désactiver" : "Activer"}
          </Button>
        </form>

        {!template.isDefault ? (
          <form action="/admin/templates/set-default" method="post">
            <input name="templateId" type="hidden" value={template.id} />
            <Button
              aria-label={`Définir ${template.name} comme template par défaut`}
              type="submit"
              variant="ghost"
              style={{ fontSize: "0.8125rem", padding: "0.25rem 0.625rem" }}
            >
              Définir par défaut
            </Button>
          </form>
        ) : null}

        <DeleteForm templateId={template.id} templateName={template.name} />
      </div>
    </div>
  );
}

export function errorMessage(code: string) {
  switch (code) {
    case "template_last_default":
      return "Impossible de supprimer le seul template de ce type.";
    case "template_delete_failed":
      return "Une erreur est survenue lors de la suppression.";
    case "template_missing":
      return "Template introuvable.";
    case "template_invalid_layout":
      return "Le layout JSON est invalide.";
    default:
      return "Une erreur est survenue lors de l'enregistrement.";
  }
}
