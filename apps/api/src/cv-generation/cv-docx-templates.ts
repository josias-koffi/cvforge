import type { CVDocumentContent, LetterDocumentContent } from "@cvforge/types";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

function paragraph(text: string, options: { bold?: boolean } = {}) {
  return new Paragraph({
    children: [new TextRun({ bold: options.bold, text })],
    spacing: { after: 140 },
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ bold: true, text })],
    heading: HeadingLevel.HEADING_2,
    spacing: { after: 120, before: 180 },
  });
}

function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    children: [new TextRun(text)],
    spacing: { after: 80 },
  });
}

export function renderCvDocx(content: CVDocumentContent) {
  const candidate = content.candidate;
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          bold: true,
          size: 34,
          text: `${candidate.firstName} ${candidate.lastName}`.trim(),
        }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(candidate.title)],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun(
          [
            candidate.phone,
            candidate.email,
            candidate.city,
            candidate.linkedin,
            candidate.github,
          ]
            .filter(Boolean)
            .join(" | "),
        ),
      ],
      spacing: { after: 240 },
    }),
  ];

  if (candidate.summary) {
    children.push(sectionHeading("Profil"), paragraph(candidate.summary));
  }

  if (content.experiences.length > 0) {
    children.push(sectionHeading("Experiences"));
    content.experiences.forEach((experience) => {
      children.push(
        paragraph(
          `${experience.position} - ${experience.company} (${experience.startDate} - ${experience.endDate})`,
          { bold: true },
        ),
        paragraph(experience.description),
        ...experience.achievements.map(bullet),
      );
    });
  }

  if (content.education.length > 0) {
    children.push(sectionHeading("Formation"));
    content.education.forEach((education) => {
      children.push(
        paragraph(
          `${education.degree} - ${education.institution} (${education.year})`,
          { bold: true },
        ),
      );
      if (education.mention) {
        children.push(paragraph(education.mention));
      }
      if (education.description) {
        children.push(paragraph(education.description));
      }
    });
  }

  if (content.skills.hard.length > 0 || content.skills.soft.length > 0) {
    children.push(sectionHeading("Competences"));
    if (content.skills.hard.length > 0) {
      children.push(
        paragraph(`Hard skills: ${content.skills.hard.join(", ")}`),
      );
    }
    if (content.skills.soft.length > 0) {
      children.push(
        paragraph(`Soft skills: ${content.skills.soft.join(", ")}`),
      );
    }
  }

  if (content.interests) {
    children.push(
      sectionHeading("Centres d'interet"),
      paragraph(content.interests),
    );
  }

  if (content.languages.length > 0) {
    children.push(sectionHeading("Langues"));
    content.languages.forEach((language) => {
      children.push(paragraph(`${language.language} - ${language.level}`));
    });
  }

  if (content.certifications.length > 0) {
    children.push(sectionHeading("Certifications"));
    content.certifications.forEach((certification) => {
      children.push(
        paragraph(
          `${certification.title} - ${certification.issuer} (${certification.year})`,
        ),
      );
    });
  }

  if (content.projects.length > 0) {
    children.push(sectionHeading("Projets"));
    content.projects.forEach((project) => {
      children.push(paragraph(project.title, { bold: true }));
      children.push(paragraph(project.description));
      if (project.url) {
        children.push(paragraph(project.url));
      }
    });
  }

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

export function renderLetterDocx(content: LetterDocumentContent) {
  const candidate = content.candidate;
  const placeDate = [candidate.city, content.date]
    .filter(Boolean)
    .join(", le ");
  const bodyParagraphs = [
    paragraph(content.body.paragraph1),
    paragraph(content.body.paragraph2),
    paragraph(content.body.paragraph3),
    ...(content.body.paragraph4 ? [paragraph(content.body.paragraph4)] : []),
  ];
  const children = [
    new Paragraph({
      children: [
        new TextRun({
          bold: true,
          size: 28,
          text: `${candidate.firstName} ${candidate.lastName}`.trim(),
        }),
      ],
      spacing: { after: 80 },
    }),
    ...(candidate.title ? [paragraph(candidate.title)] : []),
    paragraph(
      [candidate.phone, candidate.email, candidate.city, candidate.linkedin]
        .filter(Boolean)
        .join(" · "),
    ),
    paragraph(content.company.name),
    paragraph(content.company.city),
    paragraph(content.date),
    paragraph(`Objet : ${content.object}`, { bold: true }),
    ...bodyParagraphs,
    ...(placeDate ? [paragraph(placeDate)] : []),
    paragraph(
      `${content.signature.firstName} ${content.signature.lastName}`.trim(),
      { bold: true },
    ),
  ];

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
