import type { NormalizedJobListing } from "../../job-search.types";
import {
  classifyContract,
  htmlToText,
  normalizeLocation,
} from "../../job-listing.normalize";
import type { BoardHttpClient } from "./board-http";
import type { CompanyBoardAdapter } from "./board.types";
import { isoDate } from "./greenhouse.board";

/**
 * Personio's public XML feed (`{company}.jobs.personio.de/xml`). Flat enough
 * to read without an XML library: a `<position>` holds simple tags, a list of
 * `<jobDescription>` blocks (CDATA HTML) and a few offices. The feed names an
 * office, not a country, so the place is judged by its city.
 */
interface PersonioPosition {
  id: string;
  subcompany: string;
  office: string;
  offices: string[];
  department: string;
  name: string;
  employmentType: string;
  schedule: string;
  createdAt: string;
  sections: Array<{ name: string; value: string }>;
}

export class PersonioBoard implements CompanyBoardAdapter {
  readonly provider = "personio" as const;

  constructor(private readonly http: BoardHttpClient) {}

  async fetchBoard(boardToken: string): Promise<NormalizedJobListing[]> {
    const xml = await this.http.getText(
      this.provider,
      `https://${encodeURIComponent(boardToken)}.jobs.personio.de/xml`,
    );

    // An unknown company gets a 200 HTML "page not found": not a feed.
    if (!xml.includes("<workzag-jobs")) {
      throw new Error(`personio answered no job feed for ${boardToken}.`);
    }

    return readPositions(xml)
      .map((position) => this.toListing(position, boardToken))
      .filter((listing): listing is NormalizedJobListing => listing !== null);
  }

  private toListing(position: PersonioPosition, boardToken: string): NormalizedJobListing | null {
    if (!position.id || !position.name) return null;

    const located = [position.office, ...position.offices]
      .filter(Boolean)
      .map((office) => normalizeLocation(office))
      .find((entry) => entry.inFrance || entry.remote);

    if (!located) return null;

    const description = position.sections
      .filter((section) => section.name.toUpperCase() !== "URL")
      .map((section) => htmlToText(section.value))
      .filter(Boolean)
      .join("\n\n");
    const url = `https://${boardToken}.jobs.personio.de/job/${position.id}`;

    return {
      applyUrl: url,
      companyAnonymous: false,
      companyName: position.subcompany || boardToken,
      contractType: classifyContract({
        description,
        employmentType: position.employmentType,
        title: position.name,
      }),
      department: located.department,
      description,
      externalId: position.id,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: isoDate(position.createdAt),
      raw: position,
      remote: located.remote,
      salaryLabel: "",
      source: this.provider,
      title: position.name,
      url,
    };
  }
}

function readPositions(xml: string): PersonioPosition[] {
  return [...xml.matchAll(/<position>([\s\S]*?)<\/position>/g)].map(([, body = ""]) => {
    // Sections are cut out first: their HTML may hold tags named like ours.
    const sections = [...body.matchAll(/<jobDescription>([\s\S]*?)<\/jobDescription>/g)].map(
      ([, section = ""]) => ({
        name: tag(section, "name"),
        value: tag(section, "value"),
      }),
    );
    const rest = body
      .replace(/<jobDescriptions>[\s\S]*?<\/jobDescriptions>/, "")
      .replace(/<additionalOffices>[\s\S]*?<\/additionalOffices>/, "");
    const additional = /<additionalOffices>([\s\S]*?)<\/additionalOffices>/.exec(body)?.[1] ?? "";

    return {
      createdAt: tag(rest, "createdAt"),
      department: tag(rest, "department"),
      employmentType: tag(rest, "employmentType"),
      id: tag(rest, "id"),
      name: tag(rest, "name"),
      office: tag(rest, "office"),
      offices: [...additional.matchAll(/<office>([\s\S]*?)<\/office>/g)].map(([, office = ""]) =>
        decode(office.trim()),
      ),
      schedule: tag(rest, "schedule"),
      sections,
      subcompany: tag(rest, "subcompany"),
    };
  });
}

/** The text of the first `<name>` tag, CDATA unwrapped and entities decoded. */
function tag(source: string, name: string): string {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(source);
  if (!match?.[1]) return "";

  const cdata = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(match[1]);

  return cdata ? (cdata[1] ?? "").trim() : decode(match[1].trim());
}

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
