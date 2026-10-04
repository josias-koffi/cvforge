import {
  APPLICATION_RETENTION_DAYS,
  DELETION_NOTICE_DAYS,
} from "../applications/application-retention.rules";
import { DEFAULT_MAX_AGE_DAYS as OFFER_RETENTION_DAYS } from "../job-search/matching/job-matching";
import type { PrivacyRetentionPolicy } from "./privacy.types";

export const AUDIO_RETENTION_DAYS = 30;
export const ATS_SCAN_RETENTION_DAYS = 30;

export const PRIVACY_RETENTION_POLICY: PrivacyRetentionPolicy = {
  audioPurgePlan: {
    execution: "InterviewPurgeService runs at module init and every 24h, removing completed sessions older than the retention window.",
    retentionDays: AUDIO_RETENTION_DAYS,
    scope: "Completed interview sessions (transcript + report) stored in interviews-state.json. Audio files in MinIO will be covered by the same policy once MinIO storage ships.",
    status: "implemented",
  },
  documentedAt: "2026-04-23",
  rules: [
    {
      action: "Immediate deletion after confirmed self-service request.",
      automation: "Implemented in the MVP privacy delete flow.",
      dataType: "Account identity, candidatures, notifications, and credit ledger entries owned by the user",
      retention: "Retained only while the account remains active.",
    },
    {
      action: "Delete after 15 minutes or upon consumption.",
      automation: "Already enforced by the auth service.",
      dataType: "Passwordless magic links",
      retention: "15 minutes maximum.",
    },
    {
      action: "Delete after 48 hours or upon consumption.",
      automation: "Already enforced by the auth account store.",
      dataType: "Invitation links",
      retention: "48 hours maximum.",
    },
    {
      action: "Scrub issuer references if the issuing admin deletes their own account.",
      automation: "Implemented in the MVP privacy delete flow.",
      dataType: "Third-party admin references inside manual credit grants and issued invitations",
      retention: "Business record kept, personal reference anonymized immediately on account deletion.",
    },
    {
      action: `Delete automatically after ${AUDIO_RETENTION_DAYS} days.`,
      automation: "Planned before the interview-audio sprint lands in production.",
      dataType: "Interview audio files and transcripts",
      retention: `${AUDIO_RETENTION_DAYS} days.`,
    },
    {
      action: `Delete automatically after ${ATS_SCAN_RETENTION_DAYS} days.`,
      automation: "Implemented in AtsPurgeService, which runs at module init and every 24h.",
      dataType:
        "Public ATS scans: the computed scores and finding codes, the hashed visitor address, and the email address once the detailed report is unlocked. The uploaded CV is never stored — neither the file, nor the extracted text, nor a pseudonymised copy; it exists only in memory for the duration of the request.",
      retention: `${ATS_SCAN_RETENTION_DAYS} days.`,
    },
    {
      action: `Delete automatically ${APPLICATION_RETENTION_DAYS} days after the last change, after a warning by e-mail and in the app ${DELETION_NOTICE_DAYS} days before.`,
      automation:
        "Implemented in ApplicationRetentionService (US-170), at module init and every 24h, once a first pass was launched by hand (`applications:purge`).",
      dataType:
        "Applications with their CV and letter versions, the interview sessions attached to them and the notifications about them. Opening an application does not count as a change; a new status, a generation or an edit does.",
      retention: `${APPLICATION_RETENTION_DAYS} days after the last change.`,
    },
    {
      action: `Anonymize when closed; delete ${OFFER_RETENTION_DAYS} days after publication or closing, unless an active application points to it.`,
      automation:
        "Anonymization when an advert closes; JobPurgeService (US-169) every day, once a first purge was launched by hand (`jobs:purge`).",
      dataType:
        "Collected job offers: the recruiter's contact and the company fields are removed from a closed advert, then the offer is deleted.",
      retention: `${OFFER_RETENTION_DAYS} days.`,
    },
  ],
};
