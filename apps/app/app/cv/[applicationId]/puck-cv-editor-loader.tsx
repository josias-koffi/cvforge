"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { PuckCvEditorProps } from "./puck-cv-editor";

const PuckCvEditorDynamic = dynamic(
  () => import("./puck-cv-editor").then((m) => m.PuckCvEditor),
  { ssr: false },
);

export function PuckCvEditorLoader(props: PuckCvEditorProps) {
  return <PuckCvEditorDynamic {...props} />;
}
