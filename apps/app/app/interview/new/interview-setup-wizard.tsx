"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@cvforge/ui";
import type {
  InterviewRecruiterProfile,
  InterviewSessionStartRequest,
  InterviewSessionSummary,
  Locale,
} from "@cvforge/types";

export type SetupApplication = {
  companyName: string | null;
  id: string;
  title: string;
};

type Step = 1 | 2 | 3;

const PROFILES: {
  id: InterviewRecruiterProfile;
  icon: string;
  label: string;
  hint: string;
}[] = [
  { id: "standard", icon: "🧑‍💼", label: "Standard", hint: "Entretien RH classique, neutre et professionnel." },
  { id: "aggressive", icon: "⚡", label: "Agressif", hint: "Questions pièges, pression et relances incisives." },
  { id: "passive", icon: "🌫️", label: "Passif", hint: "Tonalité sobre, silences implicites et vagues." },
  { id: "technical", icon: "🔧", label: "Technique", hint: "Focus hard skills, architecture et mises en situation." },
  { id: "behavioral", icon: "🧠", label: "Comportemental", hint: "Questions STAR sur les situations vécues." },
];

function StepIndicator({ current }: { current: Step }) {
  const steps: { num: Step; label: string }[] = [
    { num: 1, label: "Candidature" },
    { num: 2, label: "Profil" },
    { num: 3, label: "Paramètres" },
  ];

  return (
    <div
      aria-label="Étapes du setup"
      style={{
        alignItems: "center",
        display: "flex",
        gap: "0",
        justifyContent: "center",
        marginBottom: "2rem",
      }}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.num}>
          <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div
              aria-current={current === step.num ? "step" : undefined}
              style={{
                alignItems: "center",
                background: current > step.num ? "#4A7C59" : current === step.num ? "#2C2C2A" : "transparent",
                border: `2px solid ${current >= step.num ? (current > step.num ? "#4A7C59" : "#2C2C2A") : "#D9D4CA"}`,
                borderRadius: "50%",
                color: current >= step.num ? "#FFFFFF" : "#9B978E",
                display: "flex",
                fontSize: "0.85rem",
                fontWeight: 600,
                height: "2rem",
                justifyContent: "center",
                width: "2rem",
              }}
            >
              {current > step.num ? "✓" : step.num}
            </div>
            <span
              style={{
                color: current === step.num ? "#1A1A18" : "#9B978E",
                fontSize: "0.75rem",
                fontWeight: current === step.num ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              aria-hidden="true"
              style={{
                background: current > index + 1 ? "#4A7C59" : "#D9D4CA",
                flexShrink: 0,
                height: "2px",
                marginBottom: "1.2rem",
                width: "3rem",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Step1Candidature({
  applications,
  selectedId,
  onSelect,
}: {
  applications: SetupApplication[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = query.trim()
    ? applications.filter(
        (app) =>
          app.title.toLowerCase().includes(query.toLowerCase()) ||
          (app.companyName ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : applications;

  const selectedApp = applications.find((app) => app.id === selectedId);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h2 style={{ color: "#1A1A18", fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
        Pour quelle candidature ?
      </h2>
      <p style={{ color: "#6B6860", fontSize: "0.95rem", margin: 0 }}>
        Sélectionnez une candidature pour contextualiser les questions de l'agent IA, ou démarrez en mode libre.
      </p>

      <button
        aria-pressed={selectedId === ""}
        onClick={() => onSelect("")}
        style={{
          background: selectedId === "" ? "#F2F0EB" : "#FFFFFF",
          border: `2px solid ${selectedId === "" ? "#2C2C2A" : "#D9D4CA"}`,
          borderRadius: "0.75rem",
          cursor: "pointer",
          display: "flex",
          gap: "0.75rem",
          padding: "1rem 1.25rem",
          textAlign: "left",
          width: "100%",
        }}
        type="button"
      >
        <span style={{ fontSize: "1.25rem" }}>🆓</span>
        <div>
          <div style={{ color: "#1A1A18", fontWeight: 600 }}>Mode pratique libre</div>
          <div style={{ color: "#6B6860", fontSize: "0.85rem" }}>Sans candidature associée</div>
        </div>
        {selectedId === "" && <span style={{ color: "#4A7C59", marginLeft: "auto" }}>✓</span>}
      </button>

      {applications.length > 0 && (
        <>
          <input
            aria-label="Rechercher une candidature"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un poste ou une entreprise…"
            style={{
              background: "#FFFFFF",
              border: "1px solid #D9D4CA",
              borderRadius: "0.65rem",
              color: "#1A1A18",
              fontSize: "0.95rem",
              padding: "0.6rem 0.9rem",
              width: "100%",
            }}
            type="search"
            value={query}
          />
          <div
            role="listbox"
            aria-label="Candidatures disponibles"
            style={{
              border: "1px solid #D9D4CA",
              borderRadius: "0.75rem",
              maxHeight: "16rem",
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 ? (
              <p style={{ color: "#9B978E", fontSize: "0.9rem", padding: "0.75rem 1rem" }}>
                Aucune candidature trouvée.
              </p>
            ) : (
              filtered.map((app, index) => (
                <button
                  aria-selected={selectedId === app.id}
                  key={app.id}
                  onClick={() => onSelect(app.id)}
                  role="option"
                  style={{
                    background: selectedId === app.id ? "#F2F0EB" : "#FFFFFF",
                    border: "none",
                    borderBottom: index < filtered.length - 1 ? "1px solid #EDE9E3" : "none",
                    cursor: "pointer",
                    display: "flex",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    textAlign: "left",
                    width: "100%",
                  }}
                  type="button"
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#1A1A18", fontWeight: selectedId === app.id ? 600 : 400 }}>
                      {app.title}
                    </div>
                    {app.companyName && (
                      <div style={{ color: "#6B6860", fontSize: "0.85rem" }}>{app.companyName}</div>
                    )}
                  </div>
                  {selectedId === app.id && <span style={{ color: "#4A7C59" }}>✓</span>}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {selectedId !== "" && selectedApp && (
        <div
          style={{
            background: "#F2F0EB",
            border: "1px solid #2C2C2A",
            borderRadius: "0.75rem",
            fontSize: "0.9rem",
            padding: "0.75rem 1rem",
          }}
        >
          <strong style={{ color: "#1A1A18" }}>{selectedApp.title}</strong>
          {selectedApp.companyName && (
            <span style={{ color: "#6B6860" }}> — {selectedApp.companyName}</span>
          )}
        </div>
      )}
    </div>
  );
}

function Step2Profile({
  selected,
  onSelect,
}: {
  selected: InterviewRecruiterProfile;
  onSelect: (profile: InterviewRecruiterProfile) => void;
}) {
  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h2 style={{ color: "#1A1A18", fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
        Quel style de recruteur ?
      </h2>
      <p style={{ color: "#6B6860", fontSize: "0.95rem", margin: 0 }}>
        Chaque profil adapte le ton, le rythme et les questions de l'agent IA.
      </p>
      <div
        role="radiogroup"
        aria-label="Profil recruteur"
        style={{ display: "grid", gap: "0.75rem" }}
      >
        {PROFILES.map((profile) => (
          <button
            aria-checked={selected === profile.id}
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            role="radio"
            style={{
              alignItems: "flex-start",
              background: selected === profile.id ? "#F2F0EB" : "#FFFFFF",
              border: `2px solid ${selected === profile.id ? "#2C2C2A" : "#D9D4CA"}`,
              borderRadius: "0.75rem",
              cursor: "pointer",
              display: "flex",
              gap: "0.9rem",
              padding: "1rem 1.25rem",
              textAlign: "left",
              transition: "border-color 0.15s, background 0.15s",
              width: "100%",
            }}
            type="button"
          >
            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{profile.icon}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#1A1A18",
                  fontWeight: selected === profile.id ? 600 : 500,
                  marginBottom: "0.2rem",
                }}
              >
                {profile.label}
              </div>
              <div style={{ color: "#6B6860", fontSize: "0.85rem", lineHeight: 1.4 }}>
                {profile.hint}
              </div>
            </div>
            {selected === profile.id && <span style={{ color: "#4A7C59", fontSize: "1.1rem" }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3Params({
  language,
  profile,
  onLanguageChange,
}: {
  language: Locale;
  profile: InterviewRecruiterProfile;
  onLanguageChange: (lang: Locale) => void;
}) {
  const profileMeta = PROFILES.find((p) => p.id === profile);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <h2 style={{ color: "#1A1A18", fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>
        Langue et paramètres
      </h2>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ color: "#1A1A18", fontWeight: 500 }}>Langue de l'entretien</label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {(["fr", "en"] as Locale[]).map((lang) => (
            <button
              aria-pressed={language === lang}
              key={lang}
              onClick={() => onLanguageChange(lang)}
              style={{
                background: language === lang ? "#2C2C2A" : "transparent",
                border: `2px solid ${language === lang ? "#2C2C2A" : "#D9D4CA"}`,
                borderRadius: "0.65rem",
                color: language === lang ? "#FFFFFF" : "#4E4A43",
                cursor: "pointer",
                flex: 1,
                fontSize: "1rem",
                fontWeight: 600,
                padding: "0.75rem",
                transition: "background 0.15s, color 0.15s",
              }}
              type="button"
            >
              {lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "#F2F0EB",
          border: "1px solid #D9D4CA",
          borderRadius: "0.75rem",
          display: "grid",
          gap: "0.5rem",
          padding: "1rem 1.25rem",
        }}
      >
        <div style={{ color: "#6B6860", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Récapitulatif
        </div>
        {profileMeta && (
          <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
            <span>{profileMeta.icon}</span>
            <span style={{ color: "#1A1A18", fontWeight: 500 }}>Profil {profileMeta.label}</span>
          </div>
        )}
        <div style={{ color: "#6B6860", fontSize: "0.85rem" }}>Durée estimée : ~10 minutes</div>
      </div>
    </div>
  );
}

export function InterviewSetupWizard({
  applications,
  initialCandidatureId,
}: {
  applications: SetupApplication[];
  initialCandidatureId: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [applicationId, setApplicationId] = React.useState(initialCandidatureId);
  const [profile, setProfile] = React.useState<InterviewRecruiterProfile>("standard");
  const [language, setLanguage] = React.useState<Locale>("fr");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const payload: InterviewSessionStartRequest = {
        applicationId: applicationId || undefined,
        language,
        profile,
      };
      const response = await fetch("/interview/start", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setError("Impossible de créer la session. Veuillez réessayer.");
        return;
      }

      const data = (await response.json()) as {
        session: InterviewSessionSummary;
        sessionId: string;
      };

      router.push(`/interview/${data.sessionId}`);
    } catch {
      setError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        margin: "0 auto",
        maxWidth: "560px",
        padding: "0 1rem",
      }}
    >
      <StepIndicator current={step} />

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #D9D4CA",
          borderRadius: "1rem",
          padding: "1.75rem",
        }}
      >
        {step === 1 && (
          <Step1Candidature
            applications={applications}
            onSelect={setApplicationId}
            selectedId={applicationId}
          />
        )}
        {step === 2 && (
          <Step2Profile onSelect={setProfile} selected={profile} />
        )}
        {step === 3 && (
          <Step3Params
            language={language}
            onLanguageChange={setLanguage}
            profile={profile}
          />
        )}

        {error && (
          <p
            role="alert"
            style={{
              background: "#FBEAE7",
              border: "1px solid #E5B8AF",
              borderRadius: "0.65rem",
              color: "#8A2C20",
              fontSize: "0.9rem",
              marginTop: "1rem",
              padding: "0.75rem 1rem",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            borderTop: "1px solid #EDE9E3",
            display: "flex",
            gap: "0.75rem",
            justifyContent: "space-between",
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
          }}
        >
          {step > 1 ? (
            <Button
              onClick={() => setStep((s) => (s - 1) as Step)}
              type="button"
              variant="ghost"
            >
              ← Retour
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              type="button"
            >
              Suivant →
            </Button>
          ) : (
            <Button
              disabled={loading}
              onClick={() => void handleStart()}
              style={{ flex: 1 }}
              type="button"
            >
              {loading ? "Démarrage…" : "Démarrer l'entretien →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
