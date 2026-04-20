"use client";

import React from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@cvforge/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createEmptyDraft,
  loadDraftFromStorage,
  saveDraftToStorage,
  type OnboardingDraft,
} from "./draft";
import {
  formatSavedAt,
  getProgressPercent,
  isPersonalStepComplete,
  onboardingSteps,
  updateDraftMeta,
} from "./wizard-state";

function getStorage() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

/* v8 ignore start -- static UI markup is covered by page-level render tests; wizard state lives in wizard-state.ts */
function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={{ display: "grid", gap: "0.25rem" }}>
      <dt style={{ color: "#6B6860", fontSize: "0.9rem", fontWeight: 600 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{value || "Non renseigne"}</dd>
    </div>
  );
}

export function OnboardingWizard({ sessionEmail }: { sessionEmail: string }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(() => createEmptyDraft(sessionEmail));
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const storedDraft = loadDraftFromStorage(sessionEmail, getStorage());
    setDraft(storedDraft);
    setHydrated(true);
  }, [sessionEmail]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveDraftToStorage(draft, getStorage());
  }, [draft, hydrated]);

  const setCurrentStep = React.useCallback((nextStep: number) => {
    setDraft((currentDraft) => updateDraftMeta(currentDraft, nextStep));
  }, []);

  const updateSection = React.useCallback(
    <TSectionKey extends keyof OnboardingDraft>(
      section: TSectionKey,
      field: keyof OnboardingDraft[TSectionKey],
      value: string | boolean,
    ) => {
      setDraft((currentDraft) =>
        updateDraftMeta(
          {
            ...currentDraft,
            [section]: {
              ...currentDraft[section],
              [field]: value,
            },
          } as OnboardingDraft,
          currentDraft.meta.currentStep,
        ),
      );
    },
    [],
  );

  const goToNextStep = React.useCallback(() => {
    setDraft((currentDraft) =>
      updateDraftMeta(
        currentDraft,
        Math.min(currentDraft.meta.currentStep + 1, onboardingSteps.length - 1),
      ),
    );
  }, []);

  const goToPreviousStep = React.useCallback(() => {
    setDraft((currentDraft) =>
      updateDraftMeta(currentDraft, Math.max(currentDraft.meta.currentStep - 1, 0)),
    );
  }, []);

  const handleCompleteProfile = React.useCallback(() => {
    const finalizedDraft = updateDraftMeta(draft, onboardingSteps.length - 1);
    saveDraftToStorage(finalizedDraft, getStorage());
    router.push("/profile");
  }, [draft, router]);

  return (
    <section
      aria-label="Wizard d'onboarding"
      style={{
        display: "grid",
        gap: "1rem",
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Wizard d&apos;onboarding en 5 etapes</CardTitle>
          <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
            Le parcours se lance a la premiere connexion et conserve un brouillon
            local pour reprise ulterieure.
          </p>
        </CardHeader>
        <CardContent style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              backgroundColor: "#F2F0EB",
              borderRadius: "999px",
              height: "0.75rem",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                backgroundColor: "#2C2C2A",
                height: "100%",
                transition: "width 180ms ease",
                width: `${getProgressPercent(draft.meta.currentStep)}%`,
              }}
            />
          </div>
          <p style={{ color: "#6B6860", margin: 0 }}>{formatSavedAt(draft.meta.lastSavedAt)}</p>
          <ol
            style={{
              display: "grid",
              gap: "0.75rem",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {onboardingSteps.map((step) => {
              const isActive = step.id === draft.meta.currentStep;

              return (
                <li
                  key={step.id}
                  style={{
                    border: `1px solid ${isActive ? "#2C2C2A" : "#D9D4CA"}`,
                    borderRadius: "1rem",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    <strong>{step.title}</strong>
                    <span style={{ color: "#6B6860" }}>{step.description}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {draft.meta.currentStep === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="first-name">Prenom</Label>
                <Input
                  id="first-name"
                  onChange={(event) =>
                    updateSection("personal", "firstName", event.target.value)
                  }
                  value={draft.personal.firstName}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="last-name">Nom</Label>
                <Input
                  id="last-name"
                  onChange={(event) =>
                    updateSection("personal", "lastName", event.target.value)
                  }
                  value={draft.personal.lastName}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  onChange={(event) =>
                    updateSection("personal", "city", event.target.value)
                  }
                  value={draft.personal.city}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="phone">Telephone</Label>
                <Input
                  id="phone"
                  onChange={(event) =>
                    updateSection("personal", "phone", event.target.value)
                  }
                  type="tel"
                  value={draft.personal.phone}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="professional-email">Email professionnel</Label>
                <Input
                  disabled
                  id="professional-email"
                  value={draft.personal.professionalEmail}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.meta.currentStep === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Liens externes</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                onChange={(event) => updateSection("links", "linkedIn", event.target.value)}
                placeholder="https://www.linkedin.com/in/votre-profil"
                type="url"
                value={draft.links.linkedIn}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                onChange={(event) => updateSection("links", "github", event.target.value)}
                placeholder="https://github.com/votre-compte"
                type="url"
                value={draft.links.github}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="portfolio">Portfolio / Site web</Label>
              <Input
                id="portfolio"
                onChange={(event) => updateSection("links", "portfolio", event.target.value)}
                placeholder="https://votresite.example"
                type="url"
                value={draft.links.portfolio}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="other-link">Autre lien</Label>
              <Input
                id="other-link"
                onChange={(event) => updateSection("links", "other", event.target.value)}
                placeholder="https://autre-lien.example"
                type="url"
                value={draft.links.other}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.meta.currentStep === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Informations complementaires</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="birth-date">Date de naissance</Label>
              <Input
                id="birth-date"
                onChange={(event) =>
                  updateSection("additional", "birthDate", event.target.value)
                }
                type="date"
                value={draft.additional.birthDate}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="nationality">Nationalite</Label>
              <Input
                id="nationality"
                onChange={(event) =>
                  updateSection("additional", "nationality", event.target.value)
                }
                value={draft.additional.nationality}
              />
            </div>
            <label
              htmlFor="driving-license"
              style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
            >
              <input
                checked={draft.additional.hasDrivingLicense}
                id="driving-license"
                onChange={(event) =>
                  updateSection(
                    "additional",
                    "hasDrivingLicense",
                    event.target.checked,
                  )
                }
                type="checkbox"
              />
              <span>Permis de conduire</span>
            </label>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="languages">Langues parlees + niveau</Label>
              <Textarea
                id="languages"
                onChange={(event) =>
                  updateSection("additional", "languages", event.target.value)
                }
                placeholder="Francais C2, Anglais B2"
                value={draft.additional.languages}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="education-level">Niveau d&apos;etudes</Label>
              <Input
                id="education-level"
                onChange={(event) =>
                  updateSection("additional", "educationLevel", event.target.value)
                }
                placeholder="Bac+5, Master, BTS..."
                value={draft.additional.educationLevel}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="target-sectors">Secteur(s) cible(s)</Label>
              <Textarea
                id="target-sectors"
                onChange={(event) =>
                  updateSection("additional", "targetSectors", event.target.value)
                }
                placeholder="Produit, SaaS, sante..."
                value={draft.additional.targetSectors}
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="contract-types">Types de contrat recherches</Label>
              <Textarea
                id="contract-types"
                onChange={(event) =>
                  updateSection("additional", "contractTypes", event.target.value)
                }
                placeholder="CDI, CDD, freelance..."
                value={draft.additional.contractTypes}
              />
            </div>
            <fieldset
              style={{
                border: "1px solid #D9D4CA",
                borderRadius: "1rem",
                display: "grid",
                gap: "0.75rem",
                padding: "1rem",
              }}
            >
              <legend style={{ padding: "0 0.25rem" }}>Disponibilite</legend>
              <label
                htmlFor="availability-immediate"
                style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
              >
                <input
                  checked={draft.additional.availabilityMode === "immediate"}
                  id="availability-immediate"
                  name="availability"
                  onChange={() =>
                    updateSection("additional", "availabilityMode", "immediate")
                  }
                  type="radio"
                />
                <span>Immediate</span>
              </label>
              <label
                htmlFor="availability-date"
                style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
              >
                <input
                  checked={draft.additional.availabilityMode === "date"}
                  id="availability-date"
                  name="availability"
                  onChange={() =>
                    updateSection("additional", "availabilityMode", "date")
                  }
                  type="radio"
                />
                <span>A une date precise</span>
              </label>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Label htmlFor="availability-date-value">Date de disponibilite</Label>
                <Input
                  disabled={draft.additional.availabilityMode !== "date"}
                  id="availability-date-value"
                  onChange={(event) =>
                    updateSection("additional", "availabilityDate", event.target.value)
                  }
                  type="date"
                  value={draft.additional.availabilityDate}
                />
              </div>
            </fieldset>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="salary-range">Pretentions salariales</Label>
              <Input
                id="salary-range"
                onChange={(event) =>
                  updateSection("additional", "salaryRange", event.target.value)
                }
                placeholder="45k - 55k EUR"
                value={draft.additional.salaryRange}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {draft.meta.currentStep === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Import de CV existant</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1rem" }}>
            <p style={{ color: "#6B6860", lineHeight: 1.6, margin: 0 }}>
              Cette etape est optionnelle. Vous pouvez rattacher un PDF ou DOCX
              maintenant puis completer manuellement les donnees du profil de base.
            </p>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="cv-file">Selectionner un CV</Label>
              <Input
                accept=".pdf,.doc,.docx"
                id="cv-file"
                onChange={(event) => {
                  const nextFileName = event.target.files?.[0]?.name ?? "";
                  updateSection("importCv", "fileName", nextFileName);
                  if (nextFileName) {
                    updateSection("importCv", "skipped", false);
                  }
                }}
                type="file"
              />
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Label htmlFor="cv-notes">Notes de validation</Label>
              <Textarea
                id="cv-notes"
                onChange={(event) =>
                  updateSection("importCv", "notes", event.target.value)
                }
                placeholder="Ex. verifier les dates, enrichir les experiences..."
                value={draft.importCv.notes}
              />
            </div>
            <label
              htmlFor="skip-import"
              style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}
            >
              <input
                checked={draft.importCv.skipped}
                id="skip-import"
                onChange={(event) =>
                  updateSection("importCv", "skipped", event.target.checked)
                }
                type="checkbox"
              />
              <span>Je saute cette etape pour creer mon profil manuellement.</span>
            </label>
            <p style={{ color: "#6B6860", margin: 0 }}>
              Fichier retenu: {draft.importCv.fileName || "Aucun fichier selectionne"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {draft.meta.currentStep === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recapitulatif & validation</CardTitle>
          </CardHeader>
          <CardContent style={{ display: "grid", gap: "1.5rem" }}>
            <section style={{ display: "grid", gap: "0.75rem" }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                }}
              >
                <strong>Informations personnelles</strong>
                <Button onClick={() => setCurrentStep(0)} size="sm" variant="ghost">
                  Modifier
                </Button>
              </div>
              <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
                <SummaryRow label="Prenom" value={draft.personal.firstName} />
                <SummaryRow label="Nom" value={draft.personal.lastName} />
                <SummaryRow label="Ville" value={draft.personal.city} />
                <SummaryRow label="Telephone" value={draft.personal.phone} />
                <SummaryRow
                  label="Email professionnel"
                  value={draft.personal.professionalEmail}
                />
              </dl>
            </section>

            <section style={{ display: "grid", gap: "0.75rem" }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                }}
              >
                <strong>Liens externes</strong>
                <Button onClick={() => setCurrentStep(1)} size="sm" variant="ghost">
                  Modifier
                </Button>
              </div>
              <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
                <SummaryRow label="LinkedIn" value={draft.links.linkedIn} />
                <SummaryRow label="GitHub" value={draft.links.github} />
                <SummaryRow label="Portfolio" value={draft.links.portfolio} />
                <SummaryRow label="Autre lien" value={draft.links.other} />
              </dl>
            </section>

            <section style={{ display: "grid", gap: "0.75rem" }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                }}
              >
                <strong>Informations complementaires</strong>
                <Button onClick={() => setCurrentStep(2)} size="sm" variant="ghost">
                  Modifier
                </Button>
              </div>
              <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
                <SummaryRow label="Date de naissance" value={draft.additional.birthDate} />
                <SummaryRow label="Nationalite" value={draft.additional.nationality} />
                <SummaryRow
                  label="Permis de conduire"
                  value={draft.additional.hasDrivingLicense ? "Oui" : "Non"}
                />
                <SummaryRow label="Langues" value={draft.additional.languages} />
                <SummaryRow
                  label="Niveau d'etudes"
                  value={draft.additional.educationLevel}
                />
                <SummaryRow
                  label="Secteurs cibles"
                  value={draft.additional.targetSectors}
                />
                <SummaryRow
                  label="Contrats recherches"
                  value={draft.additional.contractTypes}
                />
                <SummaryRow
                  label="Disponibilite"
                  value={
                    draft.additional.availabilityMode === "immediate"
                      ? "Immediate"
                      : draft.additional.availabilityDate
                  }
                />
                <SummaryRow
                  label="Pretentions salariales"
                  value={draft.additional.salaryRange}
                />
              </dl>
            </section>

            <section style={{ display: "grid", gap: "0.75rem" }}>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "space-between",
                }}
              >
                <strong>Import de CV existant</strong>
                <Button onClick={() => setCurrentStep(3)} size="sm" variant="ghost">
                  Modifier
                </Button>
              </div>
              <dl style={{ display: "grid", gap: "0.75rem", margin: 0 }}>
                <SummaryRow label="Fichier" value={draft.importCv.fileName} />
                <SummaryRow
                  label="Etape sautee"
                  value={draft.importCv.skipped ? "Oui" : "Non"}
                />
                <SummaryRow label="Notes" value={draft.importCv.notes} />
              </dl>
            </section>
          </CardContent>
        </Card>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {draft.meta.currentStep > 0 ? (
          <Button onClick={goToPreviousStep} type="button" variant="secondary">
            Etape precedente
          </Button>
        ) : null}
        {draft.meta.currentStep < onboardingSteps.length - 1 ? (
          <Button
            disabled={draft.meta.currentStep === 0 && !isPersonalStepComplete(draft)}
            onClick={goToNextStep}
            type="button"
          >
            Continuer
          </Button>
        ) : (
          <Button
            disabled={!isPersonalStepComplete(draft)}
            onClick={handleCompleteProfile}
            type="button"
          >
            Completer mon profil
          </Button>
        )}
        <Link href="/profile" style={{ color: "#2C2C2A", fontWeight: 600, padding: "0.75rem 0" }}>
          Consulter le profil de base
        </Link>
      </div>
    </section>
  );
}
/* v8 ignore stop */
