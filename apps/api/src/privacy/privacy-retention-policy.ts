import type { PrivacyRetentionPolicy } from "./privacy.types";

export const AUDIO_RETENTION_DAYS = 30;

export const PRIVACY_RETENTION_POLICY: PrivacyRetentionPolicy = {
  audioPurgePlan: {
    execution: "Daily purge job at 03:00 UTC once interview audio storage ships.",
    retentionDays: AUDIO_RETENTION_DAYS,
    scope: "Interview audio files and derived transcripts stored in MinIO.",
    status: "planned",
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
  ],
};
