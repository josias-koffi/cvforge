import React from "react";

export function DocumentPdfPreview({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  return (
    <iframe
      data-document-preview="pdf"
      sandbox=""
      srcDoc={html}
      style={{
        aspectRatio: "210 / 297",
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D4CA",
        borderRadius: "0.25rem",
        display: "block",
        width: "100%",
      }}
      title={title}
    />
  );
}
