import type {
  ApplicationStatus,
  CVDocumentVersionEntry,
  DraftApplication,
  InterviewReport,
} from "@cvforge/types";

export type DashboardApplication = DraftApplication & {
  cvVersions?: CVDocumentVersionEntry[];
  interviewReports?: InterviewReport[];
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type ScorePoint = {
  label: string;
  score: number;
};

export type StatusSegment = {
  color: string;
  count: number;
  label: string;
  percentage: number;
  status: ApplicationStatus;
};

export type AtsInsights = {
  averageScore: number | null;
  focusApplicationTitle: string | null;
  latestScores: Array<{
    applicationId: string;
    score: number;
    title: string;
    versionCount: number;
  }>;
  points: ScorePoint[];
};

export type InterviewInsights = {
  averageScore: number | null;
  points: ScorePoint[];
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "#D9D4CA",
  sent: "#A88B5C",
  interview_scheduled: "#4A7C59",
  offer_received: "#C8A96E",
  rejected: "#C0392B",
};

const STOPWORDS = new Set([
  "avec",
  "about",
  "afin",
  "ainsi",
  "alors",
  "also",
  "and",
  "aux",
  "avec",
  "avoir",
  "candidate",
  "candidature",
  "candidat",
  "candidate",
  "dans",
  "des",
  "does",
  "dont",
  "emploi",
  "entreprise",
  "for",
  "from",
  "have",
  "into",
  "jour",
  "just",
  "leur",
  "leurs",
  "mais",
  "mise",
  "more",
  "nous",
  "notre",
  "nous",
  "pour",
  "poste",
  "role",
  "plus",
  "sans",
  "sera",
  "ses",
  "sur",
  "that",
  "the",
  "this",
  "une",
  "user",
  "vous",
  "your",
]);

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

function extractKeywords(values: Array<string | null | undefined>) {
  const tokens = values
    .flatMap((value) => normalizeToken(value ?? "").split(/\s+/))
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));

  return [...new Set(tokens)];
}

function buildOfferKeywords(application: DashboardApplication) {
  return extractKeywords([
    application.extracted.title,
    application.extracted.summary,
    application.extracted.companyName,
    application.extracted.contractType,
    application.extracted.location,
    ...application.extracted.requirements,
    ...application.extracted.responsibilities,
  ]);
}

function buildCvKeywords(version: CVDocumentVersionEntry) {
  const { candidate, certifications, education, experiences, languages, projects, skills } =
    version.content;

  return new Set(
    extractKeywords([
      candidate.title,
      candidate.summary,
      ...skills.hard,
      ...skills.soft,
      ...experiences.flatMap((experience) => [
        experience.position,
        experience.company,
        experience.description,
        ...experience.achievements,
      ]),
      ...education.flatMap((entry) => [
        entry.degree,
        entry.institution,
        entry.mention,
      ]),
      ...certifications.flatMap((entry) => [entry.title, entry.issuer]),
      ...languages.flatMap((entry) => [entry.language, entry.level]),
      ...projects.flatMap((entry) => [
        entry.title,
        entry.description,
        entry.url,
      ]),
    ]),
  );
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// Until ATS scoring becomes first-class product data, the dashboard estimates
// trajectory from persisted CV versions versus each application's offer keywords.
export function scoreCvVersionAgainstOffer(
  application: DashboardApplication,
  version: CVDocumentVersionEntry,
) {
  const offerKeywords = buildOfferKeywords(application);

  if (offerKeywords.length === 0) {
    return null;
  }

  const cvKeywords = buildCvKeywords(version);
  const matchedKeywords = offerKeywords.filter((keyword) => cvKeywords.has(keyword));
  const coverage = matchedKeywords.length / offerKeywords.length;

  return roundScore(coverage * 100);
}

function sortVersions(versions: CVDocumentVersionEntry[] | undefined) {
  return [...(versions ?? [])].sort(
    (left, right) => left.versionNumber - right.versionNumber,
  );
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { month: "short" })
    .format(value)
    .replace(".", "");
}

export function buildMonthlyTrend(
  applications: DashboardApplication[],
  now = new Date(),
): TrendPoint[] {
  const base = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from({ length: 6 }, (_, offset) => {
    const monthDate = new Date(base.getFullYear(), base.getMonth() - (5 - offset), 1);
    const count = applications.filter((application) => {
      const createdAt = new Date(application.createdAt);

      return (
        createdAt.getFullYear() === monthDate.getFullYear() &&
        createdAt.getMonth() === monthDate.getMonth()
      );
    }).length;

    return {
      label: formatMonthLabel(monthDate),
      value: count,
    };
  });
}

export function buildStatusSegments(
  applications: DashboardApplication[],
  labels: Record<ApplicationStatus, string>,
): StatusSegment[] {
  const counts = applications.reduce<Record<ApplicationStatus, number>>(
    (accumulator, application) => {
      accumulator[application.status] += 1;
      return accumulator;
    },
    {
      draft: 0,
      interview_scheduled: 0,
      offer_received: 0,
      rejected: 0,
      sent: 0,
    },
  );

  const total = applications.length;

  return (Object.keys(counts) as ApplicationStatus[])
    .map((status) => ({
      color: STATUS_COLORS[status],
      count: counts[status],
      label: labels[status],
      percentage: total === 0 ? 0 : Math.round((counts[status] / total) * 100),
      status,
    }))
    .filter((segment) => segment.count > 0 || total === 0);
}

export function buildAtsInsights(applications: DashboardApplication[]): AtsInsights {
  const candidates = applications
    .map((application) => {
      const versions = sortVersions(application.cvVersions);
      const points = versions
        .map((version) => {
          const score = scoreCvVersionAgainstOffer(application, version);

          if (score === null) {
            return null;
          }

          return {
            label: `V${version.versionNumber}`,
            score,
          };
        })
        .filter((entry): entry is ScorePoint => entry !== null);

      if (points.length === 0) {
        return null;
      }

      return {
        application,
        latestScore: points.at(-1)?.score ?? null,
        points,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        application: DashboardApplication;
        latestScore: number;
        points: ScorePoint[];
      } => entry !== null && entry.latestScore !== null,
    )
    .sort((left, right) => {
      if (right.points.length !== left.points.length) {
        return right.points.length - left.points.length;
      }

      return (
        new Date(right.application.updatedAt).getTime() -
        new Date(left.application.updatedAt).getTime()
      );
    });

  const latestScores = candidates
    .slice()
    .sort(
      (left, right) =>
        new Date(right.application.updatedAt).getTime() -
        new Date(left.application.updatedAt).getTime(),
    )
    .slice(0, 3)
    .map((entry) => ({
      applicationId: entry.application.id,
      score: entry.latestScore,
      title: entry.application.extracted.title,
      versionCount: entry.points.length,
    }));

  return {
    averageScore:
      latestScores.length === 0
        ? null
        : roundScore(
            latestScores.reduce((sum, entry) => sum + entry.score, 0) /
              latestScores.length,
          ),
    focusApplicationTitle: candidates[0]?.application.extracted.title ?? null,
    latestScores,
    points: candidates[0]?.points ?? [],
  };
}

export function buildInterviewInsights(
  applications: DashboardApplication[],
): InterviewInsights {
  const points = applications
    .flatMap((application) =>
      (application.interviewReports ?? []).map((report, index) => ({
        createdAt: report.createdAt,
        label: `${application.extracted.title} ${index + 1}`,
        score: Math.max(0, Math.min(10, Math.round(report.overallScore))),
      })),
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
    .slice(-6)
    .map(({ label, score }) => ({ label, score }));

  return {
    averageScore:
      points.length === 0
        ? null
        : Math.max(
            0,
            Math.min(
              10,
              Math.round(
                points.reduce((sum, point) => sum + point.score, 0) /
                  points.length,
              ),
            ),
          ),
    points,
  };
}
