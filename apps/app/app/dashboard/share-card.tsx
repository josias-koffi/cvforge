"use client";

import React, { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cvforge/ui";
import {
  buildDashboardShareCardSvg,
  buildShareLegend,
  type DashboardShareCardData,
} from "./share-card-content";

type DashboardShareCardProps = {
  data: DashboardShareCardData;
  linkedInShareUrl: string;
  publicShareUrl: string;
};

async function svgToJpegBlob(svg: string) {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Impossible de charger la carte."));
      nextImage.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.width || 720;
    canvas.height = image.height || 520;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas indisponible.");
    }

    context.fillStyle = "#FAFAF7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      throw new Error("Impossible de convertir la carte en JPEG.");
    }

    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function DashboardShareCard({
  data,
  linkedInShareUrl,
  publicShareUrl,
}: DashboardShareCardProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const svg = buildDashboardShareCardSvg(data);
  const svgUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const shareLegend = buildShareLegend(data);

  async function handleDownloadJpeg() {
    try {
      const jpegBlob = await svgToJpegBlob(svg);
      await downloadBlob(jpegBlob, "cvforge-dashboard-share-card.jpg");
      setStatusMessage("Carte JPEG telechargee.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Le telechargement a echoue.",
      );
    }
  }

  async function copyLegendToClipboard() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setStatusMessage("Le presse-papiers n'est pas disponible sur cet appareil.");
      return false;
    }

    await navigator.clipboard.writeText(`${shareLegend}\n${publicShareUrl}`);
    return true;
  }

  async function handleNativeShare() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const jpegBlob = await svgToJpegBlob(svg);
        const jpegFile = new File([jpegBlob], "cvforge-dashboard-share-card.jpg", {
          type: "image/jpeg",
        });

        if (
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [jpegFile] })
        ) {
          await navigator.share({
            files: [jpegFile],
            text: shareLegend,
            title: "CVforge - tableau de bord candidature",
            url: publicShareUrl,
          });
          setStatusMessage("Partage natif ouvert avec la carte JPEG.");
          return;
        }

        await navigator.share({
          text: shareLegend,
          title: "CVforge - tableau de bord candidature",
          url: publicShareUrl,
        });
        setStatusMessage("Partage natif ouvert.");
        return;
      }

      const copied = await copyLegendToClipboard();
      setStatusMessage(
        copied
          ? "Partage natif indisponible. La legende et le lien ont ete copies."
          : "Partage natif indisponible sur cet appareil.",
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setStatusMessage("Partage annule.");
        return;
      }

      setStatusMessage("Le partage natif a echoue. Utilisez le partage LinkedIn.");
    }
  }

  async function handleLinkedInShare() {
    try {
      await copyLegendToClipboard();
      if (typeof window !== "undefined") {
        window.open(linkedInShareUrl, "_blank", "noopener,noreferrer");
      }
      setStatusMessage(
        "LinkedIn ouvert. La legende et le lien public ont ete copies pour le collage manuel.",
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Impossible de preparer le partage LinkedIn.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carte partageable LinkedIn</CardTitle>
        <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
          Une carte SVG generee depuis les KPI du dashboard, avec un partage natif
          et un lien LinkedIn prets a l'emploi.
        </p>
      </CardHeader>
      <CardContent
        style={{
          alignItems: "start",
          display: "grid",
          gap: "1.25rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <div
          style={{
            backgroundColor: "#F2F0EB",
            border: "1px solid #D9D4CA",
            borderRadius: "1.5rem",
            overflow: "hidden",
            padding: "1rem",
          }}
        >
          <img
            alt="Apercu de la carte partageable CVforge."
            src={svgUri}
            style={{
              border: "1px solid #D9D4CA",
              borderRadius: "1rem",
              display: "block",
              height: "auto",
              width: "100%",
            }}
          />
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "1rem",
              display: "grid",
              gap: "0.5rem",
              padding: "1rem",
            }}
          >
            <strong style={{ color: "#1A1A18" }}>Resume partage</strong>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>{shareLegend}</p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <Button onClick={handleDownloadJpeg} type="button">
              Telecharger en JPG
            </Button>
            <Button onClick={handleNativeShare} type="button" variant="secondary">
              Partager nativement
            </Button>
            <Button onClick={handleLinkedInShare} type="button" variant="ghost">
              Ouvrir LinkedIn + copier la legende
            </Button>
            <Button
              onClick={() => {
                void copyLegendToClipboard()
                  .then(() => {
                    setStatusMessage("Legende et lien public copies.");
                  })
                  .catch(() => {
                    setStatusMessage("Impossible de copier la legende.");
                  });
              }}
              type="button"
              variant="ghost"
            >
              Copier la legende
            </Button>
            <Button asChild variant="ghost">
              <a href={publicShareUrl} rel="noreferrer" target="_blank">
                Ouvrir la page publique
              </a>
            </Button>
          </div>

          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            LinkedIn peut recuperer le visuel, le titre et la description depuis
            la page publique partagee. En revanche, sa fenetre offsite ne reprend
            pas automatiquement notre legende personnalisee, donc elle est copiee
            a part pour collage manuel.
          </p>

          {statusMessage ? (
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>{statusMessage}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
