import React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  AppShell,
  CVHeader,
  CertificationItem,
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
import { getServerApiUrl } from "../../auth-config";
import { requireSession } from "../../auth/session";
import { getAppNavigation } from "../../content";

type CvPageProps = {
  params: Promise<{ applicationId: string }>;
};

function getCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
}

async function fetchCvContent(applicationId: string): Promise<CVDocumentContent | null> {
  const cookieStore = await cookies();
  const cookieHeader = getCookieHeader(cookieStore);

  const response = await fetch(
    `${getServerApiUrl()}/applications/${applicationId}/cv`,
    {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = (await response.json()) as { cvContent: CVDocumentContent };
  return payload.cvContent;
}

const cvPageStyle = {
  backgroundColor: "#FFFFFF",
  borderRadius: "0.5rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  fontFamily: '"EB Garamond", "Libre Baskerville", Georgia, serif',
  margin: "0 auto",
  maxWidth: "760px",
  padding: "3rem 3.5rem",
} as const;

const sectionStyle = {
  display: "grid",
  gap: "0.85rem",
} as const;

export default async function CvPage({ params }: CvPageProps) {
  await requireSession();
  const { applicationId } = await params;
  const cvContent = await fetchCvContent(applicationId);

  if (!cvContent) {
    notFound();
  }

  return (
    <AppShell
      description="CV généré par CVforge via OpenRouter — données sensibles réinjectées localement."
      navigation={getAppNavigation("/candidatures")}
      title="CV généré"
    >
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <div>
          <a
            href="/candidatures"
            style={{
              color: "#6B6860",
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            ← Retour aux candidatures
          </a>
        </div>

        <div style={cvPageStyle}>
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
                  {cvContent.experiences.map((exp, i) => (
                    <ExperienceItem key={`${exp.company}-${i}`} {...exp} />
                  ))}
                </div>
              </>
            ) : null}

            {cvContent.education.length > 0 ? (
              <>
                <Divider style="solid" />
                <div style={sectionStyle}>
                  <SectionTitle label="Formation" style="accent" />
                  {cvContent.education.map((edu, i) => (
                    <EducationItem key={`${edu.institution}-${i}`} {...edu} />
                  ))}
                </div>
              </>
            ) : null}

            {(cvContent.skills.hard.length > 0 || cvContent.skills.soft.length > 0) ? (
              <>
                <Divider style="solid" />
                <div style={sectionStyle}>
                  <SectionTitle label="Compétences" style="accent" />
                  <SkillsList
                    hardSkills={cvContent.skills.hard}
                    softSkills={cvContent.skills.soft}
                  />
                </div>
              </>
            ) : null}

            {cvContent.languages.length > 0 ? (
              <>
                <Divider style="solid" />
                <div style={sectionStyle}>
                  <SectionTitle label="Langues" style="accent" />
                  {cvContent.languages.map((lang, i) => (
                    <LanguageItem key={`${lang.language}-${i}`} {...lang} />
                  ))}
                </div>
              </>
            ) : null}

            {cvContent.certifications.length > 0 ? (
              <>
                <Divider style="solid" />
                <div style={sectionStyle}>
                  <SectionTitle label="Certifications" style="accent" />
                  {cvContent.certifications.map((cert, i) => (
                    <CertificationItem key={`${cert.title}-${i}`} {...cert} />
                  ))}
                </div>
              </>
            ) : null}

            {cvContent.projects.length > 0 ? (
              <>
                <Divider style="solid" />
                <div style={sectionStyle}>
                  <SectionTitle label="Projets" style="accent" />
                  {cvContent.projects.map((proj, i) => (
                    <ProjectItem key={`${proj.title}-${i}`} {...proj} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
