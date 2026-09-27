import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  type ApplicationStatus,
  type ApplicationsKpiSummary,
} from "@cvforge/types";

/** An employer answered, whichever way. */
const RESPONSE_STATUSES = new Set<ApplicationStatus>([
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_OFFER_RECEIVED,
]);

/**
 * A candidate's applications counted by status, and the share of those sent
 * that got an answer. Drafts are left out of the rate: nobody could answer them.
 */
export function summarizeApplications(
  applications: ReadonlyArray<{ status: ApplicationStatus }>,
): ApplicationsKpiSummary {
  const statusCounts: ApplicationsKpiSummary["statusCounts"] = {
    draft: 0,
    interview_scheduled: 0,
    offer_received: 0,
    rejected: 0,
    sent: 0,
  };

  applications.forEach((application) => {
    statusCounts[application.status] += 1;
  });

  const actionableCount = applications.filter(
    (application) => application.status !== APPLICATION_STATUS_DRAFT,
  ).length;
  const respondedCount = applications.filter((application) =>
    RESPONSE_STATUSES.has(application.status),
  ).length;

  return {
    respondedCount,
    responseRate:
      actionableCount === 0
        ? 0
        : Math.round((respondedCount / actionableCount) * 100),
    statusCounts,
    totalCount: applications.length,
  };
}
