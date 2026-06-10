import React from "react";
import { renderLetterPdfHtml } from "@cvforge/document-renderer";
import type { LetterDocumentContent } from "@cvforge/types";
import { DocumentPdfPreview } from "../../document-pdf-preview";

export function LetterDocumentPreview({
  letterContent,
}: {
  letterContent: LetterDocumentContent;
}) {
  return (
    <DocumentPdfPreview
      html={renderLetterPdfHtml(letterContent)}
      title="Aperçu de la lettre tel qu'elle sera exportée en PDF"
    />
  );
}
