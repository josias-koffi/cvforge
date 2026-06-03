import {
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  type TemplateLayoutData,
  type TemplateRecord,
} from "@cvforge/types";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { StoredTemplate, TemplatesStore } from "./templates.types";

type PersistedTemplatesState = {
  templates: Record<string, StoredTemplate>;
};

function createSeedLayout(kind: TemplateRecord["kind"]): TemplateLayoutData {
  if (kind === TEMPLATE_KIND_LETTER) {
    return {
      content: [
        {
          type: "LMHeader",
          props: {
            id: "letter-header",
            city: "Paris",
            companyCity: "Lyon",
            companyName: "Example Corp",
            date: "20 April 2026",
            email: "jane@example.com",
            firstName: "Jane",
            github: "github.com/janedoe",
            lastName: "Doe",
            linkedin: "linkedin.com/in/janedoe",
            object: "Application for Senior Frontend Engineer",
            phone: "+33 6 00 00 00 00",
            title: "Senior Product Engineer",
          },
        },
        {
          type: "LMBody",
          props: {
            id: "letter-body",
            paragraph1: "I am applying for your open role with strong enthusiasm.",
            paragraph2:
              "My product and frontend experience matches the scope described.",
            paragraph3:
              "I would welcome the opportunity to discuss this role further.",
          },
        },
        {
          type: "LMSignature",
          props: {
            id: "letter-signature",
            firstName: "Jane",
            lastName: "Doe",
          },
        },
      ],
      root: { props: {} },
    };
  }

  return {
    content: [
      {
        type: "CVHeader",
        props: {
          id: "cv-header",
          city: "Paris",
          email: "jane@example.com",
          firstName: "Jane",
          github: "github.com/janedoe",
          lastName: "Doe",
          linkedin: "linkedin.com/in/janedoe",
          phone: "+33 6 00 00 00 00",
          title: "Senior Product Engineer",
        },
      },
      {
        type: "SummaryBlock",
        props: {
          id: "cv-summary",
          summary:
            "Engineer focused on resilient product delivery and collaboration.",
        },
      },
      {
        type: "ExperienceItem",
        props: {
          id: "cv-experience",
          achievements: ["Reduced latency by 22% on a critical flow."],
          company: "CVforge",
          description: "Owned the document editor roadmap and delivery.",
          endDate: "Present",
          position: "Staff Engineer",
          startDate: "2024",
        },
      },
      {
        type: "SkillsList",
        props: {
          id: "cv-skills",
          hardSkills: ["TypeScript", "React", "Node.js"],
          softSkills: ["Mentoring", "Facilitation"],
        },
      },
      {
        type: "EducationItem",
        props: {
          id: "cv-education",
          degree: "Master Informatique",
          institution: "Universite de Lille",
          mention: "Bien",
          year: "2018",
        },
      },
    ],
    root: { props: {} },
  };
}

function createSeedTemplate(kind: TemplateRecord["kind"]): StoredTemplate {
  const now = "2026-04-20T00:00:00.000Z";

  return {
    active: true,
    categories: ["ATS"],
    createdAt: now,
    id: kind === TEMPLATE_KIND_LETTER ? "template-letter-ats" : "template-cv-ats",
    isDefault: true,
    kind,
    layout: createSeedLayout(kind),
    locale: "fr",
    name: kind === TEMPLATE_KIND_LETTER ? "LM ATS par defaut" : "CV ATS par defaut",
    updatedAt: now,
  };
}

function createSeedState(): PersistedTemplatesState {
  return {
    templates: {
      [createSeedTemplate(TEMPLATE_KIND_CV).id]: createSeedTemplate(
        TEMPLATE_KIND_CV,
      ),
      [createSeedTemplate(TEMPLATE_KIND_LETTER).id]: createSeedTemplate(
        TEMPLATE_KIND_LETTER,
      ),
    },
  };
}

function isTemplateLayoutData(value: unknown): value is TemplateLayoutData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.content) &&
    typeof candidate.root === "object" &&
    candidate.root !== null
  );
}

function normalizeTemplate(template: StoredTemplate): StoredTemplate {
  return {
    ...template,
    active: Boolean(template.active),
    categories: Array.isArray(template.categories)
      ? template.categories
          .map((category) => String(category).trim())
          .filter((category) => category.length > 0)
      : [],
    isDefault: Boolean(template.isDefault),
    kind:
      template.kind === TEMPLATE_KIND_LETTER ? TEMPLATE_KIND_LETTER : TEMPLATE_KIND_CV,
    layout: isTemplateLayoutData(template.layout)
      ? {
          content: (template.layout as TemplateLayoutData).content.filter(
            (item): item is TemplateLayoutData["content"][number] => {
              if (!item || typeof item !== "object") {
                return false;
              }

              const candidate = item as unknown as Record<string, unknown>;

              return (
                typeof candidate.type === "string" &&
                typeof candidate.props === "object" &&
                candidate.props !== null
              );
            },
          ),
          root: (template.layout as TemplateLayoutData).root,
        }
      : createSeedLayout(template.kind),
    locale: template.locale === "en" ? "en" : "fr",
    name: String(template.name || "").trim() || "Template sans nom",
  };
}

export class FileTemplatesStore implements TemplatesStore {
  constructor(private readonly stateFilePath: string) {}

  create(template: StoredTemplate) {
    const state = this.readState();

    state.templates[template.id] = normalizeTemplate(template);
    this.writeState(state);

    return template;
  }

  findById(templateId: string) {
    const state = this.readState();
    const template = state.templates[templateId];

    return template ? normalizeTemplate(template) : null;
  }

  list() {
    const state = this.readState();

    return Object.values(state.templates)
      .map(normalizeTemplate)
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind.localeCompare(right.kind);
        }

        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }

  remove(templateId: string) {
    const state = this.readState();

    delete state.templates[templateId];
    this.writeState(state);
  }

  save(template: StoredTemplate) {
    const state = this.readState();

    state.templates[template.id] = normalizeTemplate(template);
    this.writeState(state);

    return template;
  }

  private readState(): PersistedTemplatesState {
    if (!existsSync(this.stateFilePath)) {
      return createSeedState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedTemplatesState>;

      const templates = Object.fromEntries(
        Object.entries(parsed.templates ?? {}).map(([id, template]) => [
          id,
          normalizeTemplate(template as StoredTemplate),
        ]),
      );

      return Object.keys(templates).length > 0
        ? { templates }
        : createSeedState();
    } catch {
      return createSeedState();
    }
  }

  private writeState(state: PersistedTemplatesState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}
