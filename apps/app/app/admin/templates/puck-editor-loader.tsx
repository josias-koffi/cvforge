"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { PuckTemplateEditorProps } from "./puck-template-editor";

const PuckTemplateEditorDynamic = dynamic(
  () => import("./puck-template-editor").then((m) => m.PuckTemplateEditor),
  { ssr: false },
);

export function PuckEditorLoader(props: PuckTemplateEditorProps) {
  return <PuckTemplateEditorDynamic {...props} />;
}
