import React from "react";
import {
  CertificationItem,
  CVHeader,
  Divider,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  SectionTitle,
  SkillsList,
  SummaryBlock,
} from "@cvforge/ui";
import type { CVDocumentContent } from "@cvforge/types";

const previewShellStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D9D4CA",
  borderRadius: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  display: "grid",
  gap: "1rem",
  fontFamily: '"EB Garamond", "Libre Baskerville", Georgia, serif',
  padding: "1.5rem",
} as const;

const sectionStyle = {
  display: "grid",
  gap: "0.85rem",
} as const;

export function CvDocumentPreview({
  cvContent,
}: {
  cvContent: CVDocumentContent;
}) {
  const skillsFollowProfile =
    cvContent.candidate.summary &&
    cvContent.experiences.length === 0 &&
    cvContent.education.length === 0;

  return (
    <div style={previewShellStyle}>
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <CVHeader {...cvContent.candidate} />

        {cvContent.candidate.summary ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Profil" style="accent" />
              <SummaryBlock summary={cvContent.candidate.summary} />
            </div>
          </>
        ) : null}

        {cvContent.experiences.length > 0 ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Expériences" style="accent" />
              {cvContent.experiences.map((experience, index) => (
                <ExperienceItem
                  key={`${experience.company}-${index}`}
                  {...experience}
                />
              ))}
            </div>
          </>
        ) : null}

        {cvContent.education.length > 0 ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Formation" style="accent" />
              {cvContent.education.map((education, index) => (
                <EducationItem
                  key={`${education.institution}-${index}`}
                  {...education}
                />
              ))}
            </div>
          </>
        ) : null}

        {cvContent.skills.hard.length > 0 ||
        cvContent.skills.soft.length > 0 ? (
          <>
            {skillsFollowProfile ? null : <Divider style="solid" />}
            <div style={sectionStyle}>
              <SectionTitle label="Compétences" style="accent" />
              <SkillsList
                hardSkills={cvContent.skills.hard}
                softSkills={cvContent.skills.soft}
              />
            </div>
          </>
        ) : null}

        {cvContent.interests ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Centres d'intérêt" style="accent" />
              <SummaryBlock summary={cvContent.interests} />
            </div>
          </>
        ) : null}

        {cvContent.languages.length > 0 ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Langues" style="accent" />
              {cvContent.languages.map((language, index) => (
                <LanguageItem
                  key={`${language.language}-${index}`}
                  {...language}
                />
              ))}
            </div>
          </>
        ) : null}

        {cvContent.certifications.length > 0 ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Certifications" style="accent" />
              {cvContent.certifications.map((certification, index) => (
                <CertificationItem
                  key={`${certification.title}-${index}`}
                  {...certification}
                />
              ))}
            </div>
          </>
        ) : null}

        {cvContent.projects.length > 0 ? (
          <>
            <Divider style="solid" />
            <div style={sectionStyle}>
              <SectionTitle label="Projets" style="accent" />
              {cvContent.projects.map((project, index) => (
                <ProjectItem key={`${project.title}-${index}`} {...project} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
