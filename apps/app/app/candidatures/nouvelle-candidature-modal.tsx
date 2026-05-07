"use client";

import React, { useEffect, useRef } from "react";
import { Button, Input, Label, Textarea } from "@cvforge/ui";

type NouvelleCondidatureModalProps = {
  open: boolean;
  onClose: () => void;
  submittedUrl?: string;
};

export function NouvelleCondidatureModal({
  open,
  onClose,
  submittedUrl = "",
}: NouvelleCondidatureModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(26, 26, 24, 0.4)",
          bottom: 0,
          left: 0,
          position: "fixed",
          right: 0,
          top: 0,
          zIndex: 40,
        }}
      />
      <div
        aria-label="Nouvelle candidature"
        aria-modal="true"
        role="dialog"
        style={{
          backgroundColor: "#FAFAF7",
          borderRadius: "1rem",
          boxShadow: "0 8px 32px rgba(26,26,24,0.18)",
          left: "50%",
          maxHeight: "90vh",
          maxWidth: "560px",
          overflowY: "auto",
          padding: "1.5rem",
          position: "fixed",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "90vw",
          zIndex: 50,
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: "1px solid #D8D2C8",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
            paddingBottom: "1rem",
          }}
        >
          <h2 style={{ color: "#1A1A18", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
            Nouvelle candidature
          </h2>
          <button
            aria-label="Fermer"
            onClick={onClose}
            ref={closeRef}
            style={{
              background: "none",
              border: "1px solid #D8D2C8",
              borderRadius: "0.5rem",
              color: "#6B6860",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              padding: "0.4rem 0.6rem",
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Importez une offre depuis son URL ou collez son texte pour créer un brouillon avec les
              champs extraits automatiquement via OpenRouter (RGPD).
            </p>
            <form
              action="/candidatures/import"
              method="POST"
              style={{ display: "grid", gap: "0.875rem" }}
            >
              <input name="sourceType" type="hidden" value="url" />
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Label htmlFor="offerUrl">URL de l&apos;offre</Label>
                <Input
                  defaultValue={submittedUrl}
                  id="offerUrl"
                  name="offerUrl"
                  placeholder="https://entreprise.example/jobs/123"
                  required
                  type="url"
                />
              </div>
              <Button type="submit">Importer depuis l&apos;URL</Button>
            </form>
          </div>

          <div
            style={{
              borderTop: "1px solid #D8D2C8",
              display: "grid",
              gap: "0.75rem",
              paddingTop: "1.25rem",
            }}
          >
            <strong style={{ color: "#1A1A18" }}>Fallback texte</strong>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Si le site bloque le scraping ou si vous n&apos;avez qu&apos;un copier-coller de
              l&apos;offre, collez son texte complet ici.
            </p>
            <form
              action="/candidatures/import"
              method="POST"
              style={{ display: "grid", gap: "0.875rem" }}
            >
              <input name="sourceType" type="hidden" value="text" />
              <div style={{ display: "grid", gap: "0.4rem" }}>
                <Label htmlFor="offerText">Texte de l&apos;offre</Label>
                <Textarea
                  id="offerText"
                  name="offerText"
                  placeholder="Collez ici le texte intégral de l'offre..."
                  required
                  rows={6}
                />
              </div>
              <Button type="submit" variant="secondary">
                Créer depuis le texte
              </Button>
            </form>
            <p style={{ color: "#6B6860", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
              Import PDF MVP : reporté. Utilisez l&apos;URL ou le texte en attendant.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
