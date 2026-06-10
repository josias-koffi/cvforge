import React from "react";
import { renderCvPdfHtml } from "@cvforge/document-renderer";
import type { CVDocumentContent } from "@cvforge/types";
import { DocumentPdfPreview } from "../../document-pdf-preview";

export function CvDocumentPreview({
  cvContent,
}: {
  cvContent: CVDocumentContent;
}) {
  return (
    <DocumentPdfPreview
      html={renderCvPdfHtml(cvContent)}
      title="Aperçu du CV tel qu'il sera exporté en PDF"
    />
  );
}
