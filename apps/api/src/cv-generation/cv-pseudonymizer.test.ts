import { describe, expect, it } from "vitest";
import { pseudonymizeCvText } from "./cv-pseudonymizer";

const BODY = `
PROFIL
Chef de projet digital, anglais courant.
EXPERIENCE
Consultante chez Acme Conseil, 2020-2024.
Pilotage de refontes de sites e-commerce.
Coordination des equipes produit et marketing.
FORMATION
Master Marketing Digital, Lyon, 2019.
COMPETENCES
Gestion de projet, SEO, analyse de donnees.
`;

describe("pseudonymizeCvText", () => {
  it("masks the last name of a text-layer header and keeps the first name", () => {
    const result = pseudonymizeCvText(`Jean Dupont\nChef de projet\n${BODY}Recommandé par M. Dupont.`);

    expect(result.firstName).toBe("Jean");
    expect(result.text).not.toMatch(/dupont/i);
    expect(result.text).toContain("Jean [CANDIDATE]");
  });

  it("masks e-mail, phone, birth date and address", () => {
    const { text } = pseudonymizeCvText(
      `Jean Dupont\njean.dupont@example.com · +33 6 12 34 56 78\nAdresse : 12 rue de Paris\nDate de naissance : 01/02/1990\n${BODY}`,
    );

    expect(text).toContain("[EMAIL_OMITTED]");
    expect(text).toContain("[PHONE_OMITTED]");
    expect(text).toContain("[ADDRESS_OMITTED]");
    expect(text).toContain("[BIRTH_DATE_OMITTED]");
    expect(text).not.toMatch(/example\.com|12 34 56|rue de Paris|1990/);
  });

  it("recovers the last name from the e-mail when OCR garbled the heading", () => {
    const ocrText = `: ARTINE\nChef de projet digital\nLyon - +33 6 12 34 56 78 - camille.martineau@gmail.com\n${BODY}Référence : MARTINEAU C.`;

    const result = pseudonymizeCvText(ocrText);

    expect(result.text).not.toMatch(/martineau/i);
    expect(result.text).not.toContain("ARTINE");
    expect(result.text).toContain(": [CANDIDATE]");
  });

  it("keeps masking a handle last name even when a header line puts it first", () => {
    const result = pseudonymizeCvText(`Martineau Conseil\ncamille.martineau@gmail.com\n${BODY}`);

    expect(result.text).not.toMatch(/martineau/i);
    expect(result.firstName).toBe("");
  });

  it("uses the LinkedIn slug as a name source", () => {
    const { text } = pseudonymizeCvText(`Chef de projet\nlinkedin.com/in/camille-martineau-4821\n${BODY}Martineau Conseil`);

    expect(text).not.toMatch(/martineau/i);
  });

  it("reads capitalised last names in either order, accent-insensitively", () => {
    const result = pseudonymizeCvText(`LEFÈVRE Hélène\n${BODY}Signé : Lefevre`);

    expect(result.firstName).toBe("Hélène");
    expect(result.text).not.toMatch(/lef[eè]vre/i);
  });

  it("masks two-letter last names", () => {
    const { text } = pseudonymizeCvText(`Minh LY\n${BODY}Référent : M. Ly`);

    expect(text).not.toMatch(/\bly\b/i);
  });

  it("masks every part of a compound last name", () => {
    const { text } = pseudonymizeCvText(`Anne-Sophie LE GALL-MORVAN\n${BODY}Contact : Le Gall`);

    expect(text).not.toMatch(/gall|morvan/i);
    expect(text).toContain("Anne-Sophie");
  });

  it("does not mistake a job title for the name when handles point elsewhere", () => {
    const result = pseudonymizeCvText(`Senior Product Engineer\nJean Dupont\njean.dupont@example.com\n${BODY}`);

    expect(result.firstName).toBe("Jean");
    expect(result.text).toContain("Senior Product Engineer");
    expect(result.text).not.toMatch(/dupont/i);
  });

  it("keeps generic handle words and word fragments outside the header", () => {
    const { text } = pseudonymizeCvText(
      `Jean Gla\ncontact.gla@example.com\n${BODY}Contact : anglais, Glasgow, Contact pro.`,
    );

    expect(text).toContain("Contact : anglais, Glasgow, Contact pro.");
  });

  it("tolerates one OCR error only in the header, not in the CV body", () => {
    const { text } = pseudonymizeCvText(`Jean Dupont\nChef de projet\n${BODY}Fournisseur Dupond et fils`);

    expect(text).toContain("Dupond et fils");
  });
});
