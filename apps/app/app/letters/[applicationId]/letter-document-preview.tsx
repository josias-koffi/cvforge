import React from "react";
import { Divider, LMBody, LMHeader, LMSignature, PaperStyles } from "@cvforge/ui";
import type { LetterDocumentContent } from "@cvforge/types";

export function LetterDocumentPreview({
  letterContent,
}: {
  letterContent: LetterDocumentContent;
}) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <PaperStyles />
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #D9D4CA",
          borderRadius: "1rem",
          boxShadow: "0 10px 30px rgba(26, 26, 24, 0.06)",
          display: "grid",
          gap: "1.25rem",
          margin: "0 auto",
          maxWidth: "760px",
          padding: "2rem",
        }}
      >
        <LMHeader
          {...letterContent.candidate}
          companyCity={letterContent.company.city}
          companyName={letterContent.company.name}
          date={letterContent.date}
          object={letterContent.object}
        />
        <Divider style="spaced" />
        <LMBody {...letterContent.body} />
        <Divider style="spaced" />
        <LMSignature {...letterContent.signature} />
      </div>
    </div>
  );
}
