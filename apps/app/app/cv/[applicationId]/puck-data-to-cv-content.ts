import type { CVDocumentContent, PuckData } from "@cvforge/types";

function str(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function strArr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : String(item)));
}

export function puckDataToCvContent(data: PuckData): CVDocumentContent {
  const headerProps =
    data.content.find((item) => item.type === "CVHeader")?.props ?? {};
  const summaryProps =
    data.content.find(
      (item) => item.type === "SummaryBlock" && item.props.id !== "interests",
    )?.props ?? {};
  const interestsProps =
    data.content.find(
      (item) => item.type === "SummaryBlock" && item.props.id === "interests",
    )?.props ?? {};
  const skillsProps =
    data.content.find((item) => item.type === "SkillsList")?.props ?? {};

  const experiences = data.content
    .filter((item) => item.type === "ExperienceItem")
    .map((item) => ({
      achievements: strArr(item.props.achievements),
      company: str(item.props.company),
      description: str(item.props.description),
      endDate: str(item.props.endDate),
      position: str(item.props.position),
      startDate: str(item.props.startDate),
    }));

  const education = data.content
    .filter((item) => item.type === "EducationItem")
    .map((item) => ({
      description: str(item.props.description),
      degree: str(item.props.degree),
      institution: str(item.props.institution),
      mention: str(item.props.mention),
      year: str(item.props.year),
    }));

  const certifications = data.content
    .filter((item) => item.type === "CertificationItem")
    .map((item) => ({
      issuer: str(item.props.issuer),
      title: str(item.props.title),
      year: str(item.props.year),
    }));

  const languages = data.content
    .filter((item) => item.type === "LanguageItem")
    .map((item) => ({
      language: str(item.props.language),
      level: str(item.props.level),
    }));

  const projects = data.content
    .filter((item) => item.type === "ProjectItem")
    .map((item) => ({
      description: str(item.props.description),
      title: str(item.props.title),
      url: str(item.props.url),
    }));

  return {
    candidate: {
      city: str(headerProps.city),
      email: str(headerProps.email),
      firstName: str(headerProps.firstName),
      github: str(headerProps.github),
      lastName: str(headerProps.lastName),
      linkedin: str(headerProps.linkedin),
      phone: str(headerProps.phone),
      summary: str(summaryProps.summary),
      title: str(headerProps.title),
    },
    certifications,
    education,
    experiences,
    interests: str(interestsProps.summary),
    languages,
    projects,
    skills: {
      hard: strArr(skillsProps.hardSkills),
      soft: strArr(skillsProps.softSkills),
    },
  };
}
