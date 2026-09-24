import {
  DEFAULT_SEARCH_RADIUS_KM,
  departmentLabel,
  emptySearchProject,
  type LeadIntent,
  type SearchProject,
} from "@cvforge/types";
import { Logger } from "@nestjs/common";
import { emptyProfileRegistry } from "../profiles/empty-profile";
import type { ProfilesStore } from "../profiles/profiles.types";
import type { SearchProjectRomeService } from "./search-project-rome.service";
import { normalizeSearchProject } from "./search-projects.normalize";
import type { SearchProjectsStore } from "./search-projects.types";

type JobSearchIntent = Extract<LeadIntent, { kind: "job_search" }>;

/**
 * Writes the search a visitor of the free job market tool asked for, once
 * their magic link is redeemed (US-137): the job confirmed, the department
 * added, the morning selection on. The next digest (E19) sends its offers.
 *
 * Only adds: an existing search keeps everything its owner set, and a job or
 * a department already there is not repeated. So redeeming twice is harmless.
 */
export class SearchProjectLeadService {
  private readonly logger = new Logger(SearchProjectLeadService.name);

  constructor(
    private readonly store: SearchProjectsStore,
    private readonly profiles: ProfilesStore,
    private readonly rome: Pick<SearchProjectRomeService, "confirm">,
    private readonly now: () => number = Date.now,
  ) {}

  async applyJobSearch(userEmail: string, intent: JobSearchIntent) {
    const profileId = await this.activeProfileId(userEmail);
    // First, so a job the referential dropped since the link was sent
    // writes nothing rather than a search with a place and no job.
    const confirmed = await this.rome.confirm(
      userEmail,
      profileId,
      intent.appellationCode,
    );
    const appellation = confirmed.find(
      (entry) => entry.code === intent.appellationCode,
    );
    const project =
      (await this.store.findByProfileId(userEmail, profileId)) ??
      emptySearchProject(profileId);

    await this.store.save(
      userEmail,
      normalizeSearchProject(
        profileId,
        withJobSearch(project, intent.department, appellation?.libelle ?? ""),
      ),
    );
    await this.store.markLeadOrigin(
      userEmail,
      profileId,
      "job_market",
      new Date(this.now()),
    );
    this.logger.log(`Search written from the job market tool.`);
  }

  /** The profile the app opens on; a blank one for an account that has none. */
  private async activeProfileId(userEmail: string): Promise<string> {
    const registry = await this.profiles.findByUserEmail(userEmail);
    const active =
      registry?.profiles.find(
        (profile) => profile.id === registry.activeProfileId,
      ) ?? registry?.profiles[0];

    if (active) return active.id;

    const created = await this.profiles.save(
      userEmail,
      emptyProfileRegistry(userEmail),
    );

    return created.activeProfileId;
  }
}

/** The search with the department and the job title added, digest on. */
export function withJobSearch(
  project: SearchProject,
  department: string,
  jobTitle: string,
): SearchProject {
  const hasDepartment = project.locations.some(
    (location) => location.department === department,
  );
  const hasTitle =
    !jobTitle ||
    project.targetRoles.some(
      (role) => role.toLowerCase() === jobTitle.toLowerCase(),
    );

  return {
    ...project,
    // The visitor asked for an e-mail every morning: that is both switches.
    digestEnabled: true,
    emailEnabled: true,
    locations: hasDepartment
      ? project.locations
      : [
          ...project.locations,
          {
            department,
            inseeCode: "",
            label: `${departmentLabel(department)} (${department})`,
            latitude: null,
            longitude: null,
            radiusKm: DEFAULT_SEARCH_RADIUS_KM,
          },
        ],
    targetRoles: hasTitle
      ? project.targetRoles
      : [...project.targetRoles, jobTitle],
  };
}
