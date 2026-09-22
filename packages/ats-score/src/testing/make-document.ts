import type { AtsDocument, AtsExperience } from "../types";

/**
 * A deliberately flawless CV, to be degraded one field at a time.
 *
 * Tests that assert ordering ("removing the email lowers contactability")
 * stay readable only if the baseline is perfect: every test then names exactly
 * the one defect it is about.
 */
export function makeDocument(overrides: Partial<AtsDocument> = {}): AtsDocument {
  const experiences = overrides.experiences ?? [
    makeExperience({ startDate: "01/2022", endDate: "present" }),
    makeExperience({ startDate: "03/2019", endDate: "12/2021" }),
  ];

  return {
    bulletCount: experiences.reduce(
      (total, experience) => total + experience.bullets.length,
      0,
    ),
    contact: {
      city: true,
      email: true,
      linkedIn: true,
      phone: true,
      portfolio: true,
    },
    educationCount: 1,
    evidenceText: experiences
      .flatMap((experience) => [experience.role, ...experience.bullets])
      .join("\n"),
    experiences,
    rawText: "Un CV parfaitement lisible.",
    sections: {
      certifications: true,
      education: true,
      experience: true,
      languages: true,
      skills: true,
      summary: true,
    },
    skills: ["typescript", "postgresql"],
    wordCount: 600,
    ...overrides,
  };
}

/**
 * Every bullet opens on an action verb, carries a figure, sits between 8 and 30
 * words, and names a declared skill — so the baseline scores 100 on `impact`
 * too, and a test that degrades one of those four properties is unambiguous
 * about which one it is measuring.
 */
export function makeExperience(
  overrides: Partial<AtsExperience> = {},
): AtsExperience {
  return {
    bullets: [
      "Réduit le temps de build TypeScript de 40% en parallélisant la chaîne CI.",
      "Optimisé 12 requêtes PostgreSQL critiques, divisant par 3 la latence du rapport.",
    ],
    company: "Acme",
    endDate: "12/2021",
    role: "Développeur",
    startDate: "03/2019",
    ...overrides,
  };
}
