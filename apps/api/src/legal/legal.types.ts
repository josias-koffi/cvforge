import type {
  AdminLegalDocument,
  LegalDocumentInput,
  LegalDocumentSlug,
} from "@cvforge/types";

export type LegalDocumentsStore = {
  listAll: () => Promise<AdminLegalDocument[]>;
  findBySlug: (slug: LegalDocumentSlug) => Promise<AdminLegalDocument | null>;
  /** Saves a draft: the published version is untouched until `publish`. */
  update: (
    slug: LegalDocumentSlug,
    input: LegalDocumentInput,
  ) => Promise<AdminLegalDocument | null>;
  /** Bumps the version and stamps the publication date. */
  publish: (slug: LegalDocumentSlug) => Promise<AdminLegalDocument | null>;
};
