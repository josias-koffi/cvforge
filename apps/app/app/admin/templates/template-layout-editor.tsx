"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  documentBlockRegistry,
  getBlocksForTemplateKind,
} from "@cvforge/ui";
import type {
  TemplateKind,
  TemplateLayoutData,
  TemplateLayoutItem,
} from "@cvforge/types";

export interface TemplateLayoutEditorProps {
  templateId: string;
  kind: TemplateKind;
  initialData: TemplateLayoutData;
}

function nextBlockId(type: string, count: number) {
  return `${type.toLowerCase()}-${count + 1}`;
}

function normalizeTextList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("\n");
  return String(value ?? "");
}

function parseFieldValue(currentValue: unknown, rawValue: string) {
  if (Array.isArray(currentValue)) {
    return rawValue
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return rawValue;
}

export function TemplateLayoutEditor({
  templateId,
  kind,
  initialData,
}: TemplateLayoutEditorProps) {
  const [layout, setLayout] = useState<TemplateLayoutData>(initialData);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const availableBlocks = useMemo(() => getBlocksForTemplateKind(kind), [kind]);

  function addBlock(type: string) {
    const definition =
      documentBlockRegistry[type as keyof typeof documentBlockRegistry];
    if (!definition) return;

    setLayout((current) => ({
      ...current,
      content: [
        ...current.content,
        {
          props: {
            ...definition.defaultProps,
            id: nextBlockId(type, current.content.length),
          },
          type,
        },
      ],
    }));
  }

  function removeBlock(index: number) {
    setLayout((current) => ({
      ...current,
      content: current.content.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setLayout((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.content.length) return current;

      const content = [...current.content];
      const [item] = content.splice(index, 1);
      content.splice(target, 0, item);
      return { ...current, content };
    });
  }

  function updateBlock(index: number, patch: Partial<TemplateLayoutItem>) {
    setLayout((current) => ({
      ...current,
      content: current.content.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function publishLayout() {
    setStatus("saving");

    try {
      const response = await fetch("/admin/templates/publish-layout", {
        body: JSON.stringify({ layout, templateId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <Card>
        <CardHeader>
          <CardTitle>Blocs disponibles</CardTitle>
          <CardDescription>
            Ajoutez les blocs métier autorisés pour ce type de template.
          </CardDescription>
        </CardHeader>
        <CardContent style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {availableBlocks.map(([name, definition]) => (
            <Button key={name} onClick={() => addBlock(name)} type="button" variant="secondary">
              Ajouter {definition.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {status === "saved" ? (
        <p aria-live="polite" style={{ color: "#4A7C59", margin: 0 }}>
          Layout enregistré avec succès.
        </p>
      ) : null}
      {status === "error" ? (
        <p aria-live="polite" style={{ color: "#C0392B", margin: 0 }}>
          Erreur lors de l'enregistrement du layout.
        </p>
      ) : null}

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {layout.content.length === 0 ? (
          <p style={{ color: "#6B6860", margin: 0 }}>
            Aucun bloc dans ce template.
          </p>
        ) : (
          layout.content.map((item, index) => {
            const definition =
              documentBlockRegistry[item.type as keyof typeof documentBlockRegistry];
            const fields = definition?.fields ?? [];

            return (
              <Card key={`${item.type}-${item.props.id ?? index}`}>
                <CardHeader>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <CardTitle>{definition?.label ?? item.type}</CardTitle>
                      <CardDescription>{item.type}</CardDescription>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button disabled={index === 0} onClick={() => moveBlock(index, -1)} type="button" variant="ghost">
                        Monter
                      </Button>
                      <Button disabled={index === layout.content.length - 1} onClick={() => moveBlock(index, 1)} type="button" variant="ghost">
                        Descendre
                      </Button>
                      <Button onClick={() => removeBlock(index)} type="button" variant="ghost">
                        Retirer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent style={{ display: "grid", gap: "0.85rem" }}>
                  {fields.map((field) => {
                    const currentValue = item.props[field];
                    const inputId = `template-${index}-${field}`;
                    const commonProps = {
                      id: inputId,
                      value: normalizeTextList(currentValue),
                      onChange: (
                        event:
                          | React.ChangeEvent<HTMLInputElement>
                          | React.ChangeEvent<HTMLTextAreaElement>,
                      ) =>
                        updateBlock(index, {
                          props: {
                            ...item.props,
                            [field]: parseFieldValue(
                              currentValue,
                              event.target.value,
                            ),
                          },
                        }),
                    };

                    return (
                      <div key={field} style={{ display: "grid", gap: "0.35rem" }}>
                        <Label htmlFor={inputId}>{field}</Label>
                        {Array.isArray(currentValue) ? (
                          <Textarea {...commonProps} rows={3} />
                        ) : (
                          <Input {...commonProps} />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Button disabled={status === "saving"} onClick={() => void publishLayout()} type="button">
          {status === "saving" ? "Publication…" : "Publier le layout"}
        </Button>
      </div>
    </div>
  );
}
