import type {
  Locale,
  TemplateAnalyticsSummary,
  TemplateKind,
  TemplateRecord,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";

export type TemplatesConfig = {
  stateFilePath: string;
};

export type StoredTemplate = TemplateRecord;

export type TemplatesStore = {
  create: (template: StoredTemplate) => StoredTemplate;
  findById: (templateId: string) => StoredTemplate | null;
  list: () => StoredTemplate[];
  remove: (templateId: string) => void;
  save: (template: StoredTemplate) => StoredTemplate;
};

export type TemplatesAnalyticsStore = {
  listAll: () => StoredApplication[];
};

export type TemplateInput = {
  active?: boolean;
  categories?: string[];
  isDefault?: boolean;
  kind?: TemplateKind;
  layout?: TemplateRecord["layout"];
  locale?: Locale;
  name?: string;
};

export type TemplateExportRow = {
  active: string;
  categories: string;
  generatedCvCount: string;
  generatedLetterCount: string;
  isDefault: string;
  kind: string;
  lastUsedAt: string;
  locale: string;
  name: string;
  templateId: string;
  updatedAt: string;
};

export type TemplatesAnalyticsPayload = {
  csv: string;
  summary: TemplateAnalyticsSummary;
};
