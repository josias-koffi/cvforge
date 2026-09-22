import type {
  AdminLegalDocument,
  LegalDocumentInput,
  LegalDocumentSlug,
  PublicLegalDocument,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import type { AdminAuditService } from "../admin/admin-audit.service";
import type { LegalDocumentsStore } from "./legal.types";

/** A draft is never served publicly: it has no publication date. */
function toPublic(document: AdminLegalDocument): PublicLegalDocument | null {
  if (!document.publishedAt) {
    return null;
  }

  return {
    body: document.body,
    publishedAt: document.publishedAt,
    slug: document.slug,
    title: document.title,
    version: document.version,
  };
}

export class LegalDocumentsService {
  constructor(
    private readonly store: LegalDocumentsStore,
    private readonly audit: AdminAuditService,
  ) {}

  listForAdmin() {
    return this.store.listAll();
  }

  async getForAdmin(slug: LegalDocumentSlug) {
    return this.require(await this.store.findBySlug(slug));
  }

  async listPublic(): Promise<PublicLegalDocument[]> {
    const documents = await this.store.listAll();

    return documents
      .map(toPublic)
      .filter((document): document is PublicLegalDocument => document !== null);
  }

  async getPublic(slug: LegalDocumentSlug): Promise<PublicLegalDocument> {
    const published = toPublic(await this.getForAdmin(slug));

    if (!published) {
      throw new NotFoundException("Ce document n'est pas publie.");
    }

    return published;
  }

  async update(slug: LegalDocumentSlug, input: LegalDocumentInput) {
    return this.require(await this.store.update(slug, input));
  }

  /**
   * Publishing puts a contract online. It is recorded in the admin audit log
   * with the version, so which text was in force when can be established.
   */
  async publish(slug: LegalDocumentSlug, actorEmail: string) {
    const document = this.require(await this.store.publish(slug));

    await this.audit.recordLegalPublication({
      actorEmail,
      slug: document.slug,
      version: document.version,
    });

    return document;
  }

  private require(document: AdminLegalDocument | null): AdminLegalDocument {
    if (!document) {
      throw new NotFoundException("Document legal introuvable.");
    }

    return document;
  }
}
