export type DashboardShareCardData = {
  averageAtsScore: number | null;
  averageInterviewScore: number | null;
  generatedAt: string;
  interviewCount: number;
  offerCount: number;
  responseRate: number;
  totalApplications: number;
};

type DashboardShareCardSearchParams = Record<string, string | string[] | undefined>;

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatMetric(value: number | null, suffix = "") {
  return value === null ? "--" : `${value}${suffix}`;
}

function parseNumber(value: string | null, fallback = 0) {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNullableNumber(value: string | null) {
  if (value === null || value === "null") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function buildShareLegend(data: DashboardShareCardData) {
  return [
    `Je suis ${data.totalApplications} candidatures avec CVforge.`,
    `Taux de reponse: ${data.responseRate}%.`,
    data.averageAtsScore === null ? null : `ATS moyen: ${data.averageAtsScore}/100.`,
    data.averageInterviewScore === null
      ? null
      : `Score entretien moyen: ${data.averageInterviewScore}/10.`,
    "Carte generee depuis mon tableau de bord CVforge.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function serializeDashboardShareCardData(data: DashboardShareCardData) {
  const searchParams = new URLSearchParams({
    averageAtsScore:
      data.averageAtsScore === null ? "null" : String(data.averageAtsScore),
    averageInterviewScore:
      data.averageInterviewScore === null
        ? "null"
        : String(data.averageInterviewScore),
    generatedAt: data.generatedAt,
    interviewCount: String(data.interviewCount),
    offerCount: String(data.offerCount),
    responseRate: String(data.responseRate),
    totalApplications: String(data.totalApplications),
  });

  return searchParams.toString();
}

export function parseDashboardShareCardData(
  searchParams: DashboardShareCardSearchParams | URLSearchParams,
): DashboardShareCardData {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(
          Object.entries(searchParams).flatMap(([key, value]) => {
            if (typeof value === "undefined") {
              return [];
            }

            return [[key, Array.isArray(value) ? value[0] ?? "" : value]];
          }),
        );

  return {
    averageAtsScore: parseNullableNumber(params.get("averageAtsScore")),
    averageInterviewScore: parseNullableNumber(
      params.get("averageInterviewScore"),
    ),
    generatedAt: params.get("generatedAt") ?? "Date indisponible",
    interviewCount: parseNumber(params.get("interviewCount")),
    offerCount: parseNumber(params.get("offerCount")),
    responseRate: parseNumber(params.get("responseRate")),
    totalApplications: parseNumber(params.get("totalApplications")),
  };
}

export function buildDashboardSharePageUrl(appUrl: string, data: DashboardShareCardData) {
  return `${appUrl}/share/dashboard?${serializeDashboardShareCardData(data)}`;
}

export function buildLinkedInShareUrl(shareUrl: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    shareUrl,
  )}`;
}

export function buildDashboardShareCardSvg(data: DashboardShareCardData) {
  const metrics = [
    {
      label: "Candidatures",
      value: String(data.totalApplications),
      x: 36,
      y: 214,
    },
    {
      label: "Taux de reponse",
      value: formatMetric(data.responseRate, "%"),
      x: 240,
      y: 214,
    },
    {
      label: "Entretiens",
      value: String(data.interviewCount),
      x: 36,
      y: 332,
    },
    {
      label: "Offres",
      value: String(data.offerCount),
      x: 240,
      y: 332,
    },
    {
      label: "ATS moyen",
      value: formatMetric(data.averageAtsScore, "/100"),
      x: 444,
      y: 214,
    },
    {
      label: "Score entretien",
      value: formatMetric(data.averageInterviewScore, "/10"),
      x: 444,
      y: 332,
    },
  ];

  const metricMarkup = metrics
    .map(
      (metric) => `
        <g transform="translate(${metric.x} ${metric.y})">
          <rect width="168" height="92" rx="20" fill="#FFFFFF" stroke="#D9D4CA" />
          <text x="20" y="34" fill="#6B6860" font-family="'DM Sans', Arial, sans-serif" font-size="14">
            ${escapeSvg(metric.label)}
          </text>
          <text x="20" y="66" fill="#1A1A18" font-family="'Playfair Display', Georgia, serif" font-size="30" font-weight="700">
            ${escapeSvg(metric.value)}
          </text>
        </g>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520" role="img" aria-label="Carte partageable CVforge">
    <defs>
      <linearGradient id="paper" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FAFAF7" />
        <stop offset="100%" stop-color="#F2F0EB" />
      </linearGradient>
    </defs>
    <rect width="720" height="520" rx="32" fill="url(#paper)" />
    <rect x="18" y="18" width="684" height="484" rx="26" fill="none" stroke="#D9D4CA" />
    <path d="M36 112 C120 96 190 132 274 112 S430 92 510 112 620 136 684 110" fill="none" stroke="#C8A96E" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 12" />
    <text x="36" y="64" fill="#6B6860" font-family="'DM Sans', Arial, sans-serif" font-size="18" letter-spacing="1.8">
      CVFORGE
    </text>
    <text x="36" y="118" fill="#1A1A18" font-family="'Playfair Display', Georgia, serif" font-size="40" font-weight="700">
      Mon tableau de bord candidature
    </text>
    <text x="36" y="154" fill="#6B6860" font-family="'DM Sans', Arial, sans-serif" font-size="18">
      Progression partageable generee le ${escapeSvg(data.generatedAt)}
    </text>
    <text x="36" y="184" fill="#6B6860" font-family="'DM Sans', Arial, sans-serif" font-size="18">
      Un apercu sobre de mes KPI CVforge, pret pour un partage social.
    </text>
    ${metricMarkup}
    <rect x="36" y="452" width="648" height="34" rx="17" fill="#1A1A18" />
    <text x="360" y="474" text-anchor="middle" fill="#FAFAF7" font-family="'DM Sans', Arial, sans-serif" font-size="15">
      CVforge · candidatures, ATS, entretiens et suivi produit dans une seule vue
    </text>
  </svg>`;
}
