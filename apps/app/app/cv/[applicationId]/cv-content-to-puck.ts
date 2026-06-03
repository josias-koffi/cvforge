import type { CVDocumentContent, PuckData, PuckDataItem } from "@cvforge/types";

export function cvContentToPuckData(cvContent: CVDocumentContent): PuckData {
  const items: PuckDataItem[] = [];

  items.push({
    type: "CVHeader",
    props: {
      id: "cv-header",
      city: cvContent.candidate.city,
      email: cvContent.candidate.email,
      firstName: cvContent.candidate.firstName,
      github: cvContent.candidate.github,
      lastName: cvContent.candidate.lastName,
      linkedin: cvContent.candidate.linkedin,
      phone: cvContent.candidate.phone,
      title: cvContent.candidate.title,
    },
  });

  if (cvContent.candidate.summary) {
    items.push({
      type: "Divider",
      props: { id: "divider-summary", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-profil", label: "Profil", style: "accent" },
    });
    items.push({
      type: "SummaryBlock",
      props: { id: "summary", summary: cvContent.candidate.summary },
    });
  }

  if (cvContent.experiences.length > 0) {
    items.push({
      type: "Divider",
      props: { id: "divider-exp", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-exp", label: "Expériences", style: "accent" },
    });
    cvContent.experiences.forEach((exp, i) => {
      items.push({ type: "ExperienceItem", props: { id: `exp-${i}`, ...exp } });
    });
  }

  if (cvContent.education.length > 0) {
    items.push({
      type: "Divider",
      props: { id: "divider-edu", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-edu", label: "Formation", style: "accent" },
    });
    cvContent.education.forEach((edu, i) => {
      items.push({ type: "EducationItem", props: { id: `edu-${i}`, ...edu } });
    });
  }

  if (cvContent.skills.hard.length > 0 || cvContent.skills.soft.length > 0) {
    const skillsFollowProfile =
      cvContent.candidate.summary &&
      cvContent.experiences.length === 0 &&
      cvContent.education.length === 0;

    if (!skillsFollowProfile) {
      items.push({
        type: "Divider",
        props: { id: "divider-skills", style: "solid" },
      });
    }
    items.push({
      type: "SectionTitle",
      props: { id: "section-skills", label: "Compétences", style: "accent" },
    });
    items.push({
      type: "SkillsList",
      props: {
        id: "skills",
        hardSkills: cvContent.skills.hard,
        softSkills: cvContent.skills.soft,
      },
    });
  }

  if (cvContent.interests) {
    items.push({
      type: "Divider",
      props: { id: "divider-interests", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: {
        id: "section-interests",
        label: "Centres d'intérêt",
        style: "accent",
      },
    });
    items.push({
      type: "SummaryBlock",
      props: { id: "interests", summary: cvContent.interests },
    });
  }

  if (cvContent.languages.length > 0) {
    items.push({
      type: "Divider",
      props: { id: "divider-lang", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-lang", label: "Langues", style: "accent" },
    });
    cvContent.languages.forEach((lang, i) => {
      items.push({ type: "LanguageItem", props: { id: `lang-${i}`, ...lang } });
    });
  }

  if (cvContent.certifications.length > 0) {
    items.push({
      type: "Divider",
      props: { id: "divider-cert", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-cert", label: "Certifications", style: "accent" },
    });
    cvContent.certifications.forEach((cert, i) => {
      items.push({
        type: "CertificationItem",
        props: { id: `cert-${i}`, ...cert },
      });
    });
  }

  if (cvContent.projects.length > 0) {
    items.push({
      type: "Divider",
      props: { id: "divider-proj", style: "solid" },
    });
    items.push({
      type: "SectionTitle",
      props: { id: "section-proj", label: "Projets", style: "accent" },
    });
    cvContent.projects.forEach((proj, i) => {
      items.push({ type: "ProjectItem", props: { id: `proj-${i}`, ...proj } });
    });
  }

  return { content: items, root: { props: {} } };
}
