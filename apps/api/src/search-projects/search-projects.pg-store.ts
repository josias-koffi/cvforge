import type { AcquisitionTool, SearchProject } from "@cvforge/types";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  romeAppellations,
  searchProjectRome,
  searchProjects,
} from "../database/schema";
import type { SearchProjectsStore } from "./search-projects.types";

type SearchProjectRow = typeof searchProjects.$inferSelect;

function toProject(row: SearchProjectRow): SearchProject {
  return {
    aiRerankEnabled: row.aiRerankEnabled,
    apprenticeship: row.apprenticeship,
    companySizes: row.companySizes,
    companyValues: row.companyValues,
    contractTypes: row.contractTypes,
    digestEnabled: row.digestEnabled,
    emailEnabled: row.emailEnabled,
    excludedCompanies: row.excludedCompanies,
    excludedSectors: row.excludedSectors,
    experienceLevel: row.experienceLevel,
    internship: row.internship,
    locations: row.locations,
    nationalMobility: row.nationalMobility,
    partTimeOk: row.partTimeOk,
    profileId: row.profileId,
    remote: row.remote,
    salaryMinYearly: row.salaryMinYearly,
    sectors: row.sectors,
    targetRoles: row.targetRoles,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PgSearchProjectsStore implements SearchProjectsStore {
  constructor(private readonly db: Database) {}

  async findByProfileId(userEmail: string, profileId: string) {
    const [row] = await this.db
      .select()
      .from(searchProjects)
      .where(
        and(
          eq(searchProjects.userEmail, userEmail),
          eq(searchProjects.profileId, profileId),
        ),
      )
      .limit(1);

    return row ? toProject(row) : null;
  }

  async listByUserEmail(userEmail: string) {
    const rows = await this.db
      .select()
      .from(searchProjects)
      .where(eq(searchProjects.userEmail, userEmail));

    return rows.map(toProject);
  }

  async listDigestEnabled() {
    const rows = await this.db
      .select()
      .from(searchProjects)
      .where(eq(searchProjects.digestEnabled, true));

    return this.withRomeCodes(rows);
  }

  async listAll() {
    return this.withRomeCodes(await this.db.select().from(searchProjects));
  }

  async findRomeCodes(userEmail: string, profileId: string) {
    const romeCodes = await this.confirmedRomeCodes({ profileId, userEmail });

    return [...(romeCodes.get(ownerKey(userEmail, profileId)) ?? [])];
  }

  private async withRomeCodes(rows: Array<typeof searchProjects.$inferSelect>) {
    const romeCodes = await this.confirmedRomeCodes();

    return rows.map((row) => ({
      project: toProject(row),
      romeCodes: [
        ...(romeCodes.get(ownerKey(row.userEmail, row.profileId)) ?? []),
      ],
      userEmail: row.userEmail,
    }));
  }

  /**
   * The métier of every confirmed appellation, one read for all searches —
   * or for one owner's. The referential's current métier wins over the
   * snapshot, so a job France Travail moved is queried where it now lives.
   */
  private async confirmedRomeCodes(owner?: {
    userEmail: string;
    profileId: string;
  }): Promise<Map<string, Set<string>>> {
    const rows = await this.db
      .select({
        metierCode: sql<string>`coalesce(${romeAppellations.metierCode}, ${searchProjectRome.metierCode})`,
        profileId: searchProjectRome.profileId,
        userEmail: searchProjectRome.userEmail,
      })
      .from(searchProjectRome)
      .leftJoin(
        romeAppellations,
        eq(romeAppellations.code, searchProjectRome.appellationCode),
      )
      .where(
        and(
          eq(searchProjectRome.status, "confirmed"),
          owner && eq(searchProjectRome.userEmail, owner.userEmail),
          owner && eq(searchProjectRome.profileId, owner.profileId),
        ),
      );
    const byOwner = new Map<string, Set<string>>();

    for (const row of rows) {
      const key = ownerKey(row.userEmail, row.profileId);
      byOwner.set(key, (byOwner.get(key) ?? new Set()).add(row.metierCode));
    }

    return byOwner;
  }

  async save(userEmail: string, project: SearchProject) {
    const values = {
      aiRerankEnabled: project.aiRerankEnabled,
      apprenticeship: project.apprenticeship,
      companySizes: project.companySizes,
      companyValues: project.companyValues,
      contractTypes: project.contractTypes,
      digestEnabled: project.digestEnabled,
      emailEnabled: project.emailEnabled,
      excludedCompanies: project.excludedCompanies,
      excludedSectors: project.excludedSectors,
      experienceLevel: project.experienceLevel,
      internship: project.internship,
      locations: project.locations,
      nationalMobility: project.nationalMobility,
      partTimeOk: project.partTimeOk,
      profileId: project.profileId,
      remote: project.remote,
      salaryMinYearly: project.salaryMinYearly,
      sectors: project.sectors,
      targetRoles: project.targetRoles,
      updatedAt: new Date(),
      userEmail,
    };

    const [row] = await this.db
      .insert(searchProjects)
      .values(values)
      .onConflictDoUpdate({
        target: [searchProjects.userEmail, searchProjects.profileId],
        set: values,
      })
      .returning();

    return toProject(row!);
  }

  async markLeadOrigin(
    userEmail: string,
    profileId: string,
    tool: AcquisitionTool,
    at: Date,
  ) {
    await this.db
      .update(searchProjects)
      .set({ leadOrigin: tool, leadOriginAt: at })
      .where(
        and(
          eq(searchProjects.userEmail, userEmail),
          eq(searchProjects.profileId, profileId),
          isNull(searchProjects.leadOrigin),
        ),
      );
  }

  /**
   * The ROME appellations go with the projects: they are the candidate's own
   * choices, and have no foreign key to cascade from (US-118).
   */
  async deleteByUserEmail(userEmail: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(searchProjectRome)
        .where(eq(searchProjectRome.userEmail, userEmail));
      const rows = await tx
        .delete(searchProjects)
        .where(eq(searchProjects.userEmail, userEmail))
        .returning({ profileId: searchProjects.profileId });

      return rows.length;
    });
  }
}

function ownerKey(userEmail: string, profileId: string): string {
  return `${userEmail}|${profileId}`;
}
