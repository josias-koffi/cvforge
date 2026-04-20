import {
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_SENT,
  applicationStatusTransitions as sharedApplicationStatusTransitions,
  applicationStatuses,
  type ApplicationStatus,
} from "@cvforge/types";

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  [APPLICATION_STATUS_DRAFT]: "Brouillon",
  [APPLICATION_STATUS_SENT]: "Envoyee",
  [APPLICATION_STATUS_INTERVIEW_SCHEDULED]: "Entretien planifie",
  [APPLICATION_STATUS_REJECTED]: "Refus",
  [APPLICATION_STATUS_OFFER_RECEIVED]: "Offre recue",
};

export const applicationStatusActionLabels: Record<ApplicationStatus, string> = {
  [APPLICATION_STATUS_DRAFT]: "Marquer comme brouillon",
  [APPLICATION_STATUS_SENT]: "Marquer comme envoyee",
  [APPLICATION_STATUS_INTERVIEW_SCHEDULED]: "Planifier un entretien",
  [APPLICATION_STATUS_REJECTED]: "Marquer comme refus",
  [APPLICATION_STATUS_OFFER_RECEIVED]: "Marquer comme offre recue",
};

export const applicationStatusOrder = [...applicationStatuses];
export const applicationStatusTransitions = sharedApplicationStatusTransitions;

export function getApplicationStatusLabel(status: ApplicationStatus) {
  return applicationStatusLabels[status];
}

export function getApplicationStatusTone(status: ApplicationStatus) {
  switch (status) {
    case APPLICATION_STATUS_DRAFT:
      return {
        backgroundColor: "#F2F0EB",
        borderColor: "#D8D2C8",
        color: "#6B6860",
      };
    case APPLICATION_STATUS_SENT:
      return {
        backgroundColor: "#F3EEE3",
        borderColor: "#DCC7A0",
        color: "#7A5A26",
      };
    case APPLICATION_STATUS_INTERVIEW_SCHEDULED:
      return {
        backgroundColor: "#EEF3F8",
        borderColor: "#BED0E3",
        color: "#305A7A",
      };
    case APPLICATION_STATUS_REJECTED:
      return {
        backgroundColor: "#FBEAE7",
        borderColor: "#E5B8AF",
        color: "#8A2C20",
      };
    case APPLICATION_STATUS_OFFER_RECEIVED:
      return {
        backgroundColor: "#EDF4EE",
        borderColor: "#C9DCCF",
        color: "#30543A",
      };
  }
}
