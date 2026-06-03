import type { CSSProperties, ReactElement } from "react";
import {
  DIVIDER_STYLE_SOLID,
  SECTION_TITLE_STYLE_ACCENT,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  type CVHeaderProps,
  type CertificationItemProps,
  type DividerProps,
  type EducationItemProps,
  type ExperienceItemProps,
  type LMBodyProps,
  type LMHeaderProps,
  type LMSignatureProps,
  type LanguageItemProps,
  type ProjectItemProps,
  type SectionTitleProps,
  type SkillsListProps,
  type SummaryBlockProps,
  type TemplateKind,
} from "../../types/src";

const documentRootStyle: CSSProperties = {
  color: "#1A1A18",
  display: "grid",
  gap: "1rem",
  lineHeight: 1.5,
};

const subtleTextStyle: CSSProperties = {
  color: "#6B6860",
  fontSize: "0.95rem",
};

const headingStyle: CSSProperties = {
  fontFamily: '"Playfair Display", "Lora", serif',
  fontSize: "1.5rem",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  margin: 0,
};

const sectionTitleStyle: CSSProperties = {
  ...headingStyle,
  fontSize: "1rem",
  textTransform: "uppercase",
};

const dividerStyles: Record<DividerProps["style"], CSSProperties> = {
  solid: {
    borderTop: "1px solid #C8A96E",
    height: 1,
    width: "100%",
  },
  spaced: {
    borderTop: "1px dashed #D7D2C7",
    height: 1,
    margin: "0.75rem 0",
    width: "100%",
  },
};

function HeaderMeta({
  city,
  email,
  github,
  linkedin,
  phone,
}: Pick<CVHeaderProps, "city" | "email" | "github" | "linkedin" | "phone">) {
  const items = [phone, email, city, linkedin, github].filter(Boolean);

  return <p style={subtleTextStyle}>{items.join(" · ")}</p>;
}

export function CVHeader(props: CVHeaderProps) {
  return (
    <header style={documentRootStyle}>
      <div>
        <h1 style={headingStyle}>
          {props.firstName} {props.lastName}
        </h1>
        <p style={{ ...subtleTextStyle, marginTop: "0.35rem" }}>
          {props.title}
        </p>
      </div>
      <HeaderMeta {...props} />
    </header>
  );
}

export function SummaryBlock({ summary }: SummaryBlockProps) {
  return <p style={{ margin: 0 }}>{summary}</p>;
}

export function ExperienceItem(props: ExperienceItemProps) {
  return (
    <article style={documentRootStyle}>
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{props.position}</h3>
          <p style={{ ...subtleTextStyle, margin: 0 }}>{props.company}</p>
        </div>
        <p style={{ ...subtleTextStyle, margin: 0 }}>
          {props.startDate} - {props.endDate}
        </p>
      </div>
      <p style={{ margin: 0 }}>{props.description}</p>
      {props.achievements.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {props.achievements.map((achievement: string) => (
            <li key={achievement}>{achievement}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function EducationItem(props: EducationItemProps) {
  return (
    <article style={documentRootStyle}>
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: "0.75rem",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>{props.degree}</h3>
          <p style={{ ...subtleTextStyle, margin: 0 }}>
            {props.institution}
            {props.mention ? ` · ${props.mention}` : ""}
          </p>
        </div>
        <p style={{ ...subtleTextStyle, margin: 0 }}>{props.year}</p>
      </div>
      {props.description ? (
        <p style={{ margin: 0 }}>{props.description}</p>
      ) : null}
    </article>
  );
}

export function SkillsList({ hardSkills, softSkills }: SkillsListProps) {
  return (
    <section style={documentRootStyle}>
      <p style={{ margin: 0 }}>
        <strong>Hard skills:</strong> {hardSkills.join(", ")}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Soft skills:</strong> {softSkills.join(", ")}
      </p>
    </section>
  );
}

export function CertificationItem(props: CertificationItemProps) {
  return (
    <p style={{ margin: 0 }}>
      <strong>{props.title}</strong> · {props.issuer} · {props.year}
    </p>
  );
}

export function LanguageItem(props: LanguageItemProps) {
  return (
    <p style={{ margin: 0 }}>
      {props.language} · {props.level}
    </p>
  );
}

export function ProjectItem(props: ProjectItemProps) {
  return (
    <article style={documentRootStyle}>
      <h3 style={{ margin: 0 }}>{props.title}</h3>
      <p style={{ margin: 0 }}>{props.description}</p>
      {props.url ? (
        <a href={props.url} style={subtleTextStyle}>
          {props.url}
        </a>
      ) : null}
    </article>
  );
}

export function LMHeader(props: LMHeaderProps) {
  return (
    <header style={documentRootStyle}>
      <div>
        <h1 style={{ ...headingStyle, color: "#1a1a1a" }}>
          {props.firstName} {props.lastName}
        </h1>
        <HeaderMeta {...props} />
        {props.title ? (
          <p
            style={{
              ...subtleTextStyle,
              fontStyle: "italic",
              marginTop: "0.2rem",
            }}
          >
            {props.title}
          </p>
        ) : null}
      </div>
      <div style={{ ...subtleTextStyle, display: "grid", gap: "0.15rem" }}>
        <p style={{ margin: 0 }}>{props.companyName}</p>
        <p style={{ margin: 0 }}>{props.companyCity}</p>
      </div>
      <p style={{ margin: 0 }}>{props.date}</p>
      <p style={{ margin: 0 }}>
        <strong>Objet :</strong> {props.object}
      </p>
    </header>
  );
}

export function LMBody(props: LMBodyProps) {
  return (
    <section style={documentRootStyle}>
      <p style={{ margin: 0 }}>{props.paragraph1}</p>
      <p style={{ margin: 0 }}>{props.paragraph2}</p>
      <p style={{ margin: 0 }}>{props.paragraph3}</p>
      {props.paragraph4 ? (
        <p style={{ margin: 0 }}>{props.paragraph4}</p>
      ) : null}
    </section>
  );
}

export function LMSignature(props: LMSignatureProps) {
  return (
    <p style={{ margin: 0 }}>
      {props.firstName} {props.lastName}
    </p>
  );
}

export function Divider({ style }: DividerProps) {
  return <div aria-hidden="true" style={dividerStyles[style]} />;
}

export function SectionTitle({ label, style }: SectionTitleProps) {
  return (
    <h2
      style={{
        ...sectionTitleStyle,
        color: style === SECTION_TITLE_STYLE_ACCENT ? "#2C2C2A" : "#6B6860",
      }}
    >
      {label}
    </h2>
  );
}

export interface DocumentBlockDefinition<TProps> {
  component: (props: TProps) => ReactElement;
  defaultProps: TProps;
  fields: readonly (keyof TProps & string)[];
  label: string;
  templateKinds: readonly TemplateKind[];
}

export const documentBlockRegistry = {
  CVHeader: {
    component: CVHeader,
    defaultProps: {
      city: "Paris",
      email: "jane@example.com",
      firstName: "Jane",
      github: "github.com/janedoe",
      lastName: "Doe",
      linkedin: "linkedin.com/in/janedoe",
      phone: "+33 6 00 00 00 00",
      title: "Senior Product Engineer",
    },
    fields: [
      "firstName",
      "lastName",
      "title",
      "phone",
      "email",
      "city",
      "linkedin",
      "github",
    ],
    label: "CV Header",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<CVHeaderProps>,
  SummaryBlock: {
    component: SummaryBlock,
    defaultProps: {
      summary:
        "Engineer focused on resilient product delivery and collaboration.",
    },
    fields: ["summary"],
    label: "Summary",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<SummaryBlockProps>,
  ExperienceItem: {
    component: ExperienceItem,
    defaultProps: {
      achievements: ["Reduced latency by 22% on a critical flow."],
      company: "CVforge",
      description: "Owned the document editor roadmap and delivery.",
      endDate: "Present",
      position: "Staff Engineer",
      startDate: "2024",
    },
    fields: [
      "company",
      "position",
      "startDate",
      "endDate",
      "description",
      "achievements",
    ],
    label: "Experience",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<ExperienceItemProps>,
  EducationItem: {
    component: EducationItem,
    defaultProps: {
      description:
        "Parcours axe sur les systemes distribues et la qualite logicielle.",
      degree: "Master Informatique",
      institution: "Universite de Lille",
      mention: "Bien",
      year: "2018",
    },
    fields: ["degree", "institution", "year", "mention", "description"],
    label: "Education",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<EducationItemProps>,
  SkillsList: {
    component: SkillsList,
    defaultProps: {
      hardSkills: ["TypeScript", "React", "Node.js"],
      softSkills: ["Mentoring", "Facilitation"],
    },
    fields: ["hardSkills", "softSkills"],
    label: "Skills",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<SkillsListProps>,
  CertificationItem: {
    component: CertificationItem,
    defaultProps: {
      issuer: "AWS",
      title: "Solutions Architect Associate",
      year: "2025",
    },
    fields: ["title", "issuer", "year"],
    label: "Certification",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<CertificationItemProps>,
  LanguageItem: {
    component: LanguageItem,
    defaultProps: {
      language: "English",
      level: "C1",
    },
    fields: ["language", "level"],
    label: "Language",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<LanguageItemProps>,
  ProjectItem: {
    component: ProjectItem,
    defaultProps: {
      description: "Built a reusable template block registry.",
      title: "Template Studio",
      url: "https://example.com/template-studio",
    },
    fields: ["title", "description", "url"],
    label: "Project",
    templateKinds: [TEMPLATE_KIND_CV],
  } satisfies DocumentBlockDefinition<ProjectItemProps>,
  LMHeader: {
    component: LMHeader,
    defaultProps: {
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
    fields: [
      "firstName",
      "lastName",
      "phone",
      "email",
      "city",
      "linkedin",
      "github",
      "companyName",
      "companyCity",
      "date",
      "object",
    ],
    label: "Letter Header",
    templateKinds: [TEMPLATE_KIND_LETTER],
  } satisfies DocumentBlockDefinition<LMHeaderProps>,
  LMBody: {
    component: LMBody,
    defaultProps: {
      paragraph1: "I am applying for your open role with strong enthusiasm.",
      paragraph2:
        "My product and frontend experience matches the scope described.",
      paragraph3:
        "I would welcome the opportunity to discuss this role further.",
    },
    fields: ["paragraph1", "paragraph2", "paragraph3"],
    label: "Letter Body",
    templateKinds: [TEMPLATE_KIND_LETTER],
  } satisfies DocumentBlockDefinition<LMBodyProps>,
  LMSignature: {
    component: LMSignature,
    defaultProps: {
      firstName: "Jane",
      lastName: "Doe",
    },
    fields: ["firstName", "lastName"],
    label: "Letter Signature",
    templateKinds: [TEMPLATE_KIND_LETTER],
  } satisfies DocumentBlockDefinition<LMSignatureProps>,
  Divider: {
    component: Divider,
    defaultProps: {
      style: DIVIDER_STYLE_SOLID,
    },
    fields: ["style"],
    label: "Divider",
    templateKinds: [TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER],
  } satisfies DocumentBlockDefinition<DividerProps>,
  SectionTitle: {
    component: SectionTitle,
    defaultProps: {
      label: "Experience",
      style: SECTION_TITLE_STYLE_ACCENT,
    },
    fields: ["label", "style"],
    label: "Section Title",
    templateKinds: [TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER],
  } satisfies DocumentBlockDefinition<SectionTitleProps>,
} as const;

export type DocumentBlockName = keyof typeof documentBlockRegistry;

export function getBlocksForTemplateKind(kind: TemplateKind) {
  return Object.entries(documentBlockRegistry).filter(([, definition]) =>
    (definition.templateKinds as readonly TemplateKind[]).includes(kind),
  );
}
