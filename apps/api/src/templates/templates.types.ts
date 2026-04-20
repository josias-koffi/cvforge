import type { Locale, TemplateKind, TemplateRecord } from "@cvforge/types";

export type TemplatesConfig = {
  stateFilePath: string;
};

export type StoredTemplate = TemplateRecord;

export type TemplatesStore = {
  create: (template: StoredTemplate) => StoredTemplate;
  findById: (templateId: string) => StoredTemplate | null;
  list: () => StoredTemplate[];
  save: (template: StoredTemplate) => StoredTemplate;
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
