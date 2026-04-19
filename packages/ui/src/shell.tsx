import React from "react";
import { paperTokenCssVars } from "./design-system";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Input, Label, Textarea } from "./field";

type AppShellProps = {
  title: string;
  description: string;
};

export function AppShell({ title, description }: AppShellProps) {
  return (
    <main className="cvforge-shell" style={paperTokenCssVars()}>
      <section className="cvforge-shell__frame">
        <Card className="cvforge-shell__hero">
          <Badge className="cvforge-shell__eyebrow" variant="outline">
            CVforge · Papier &amp; Crayon
          </Badge>
          <div className="cvforge-shell__hero-copy">
            <h1 className="cvforge-shell__title">{title}</h1>
            <p className="cvforge-shell__description">{description}</p>
          </div>
          <div className="cvforge-shell__actions">
            <Button size="lg">Commencer un CV</Button>
            <Button size="lg" variant="secondary">
              Voir les templates
            </Button>
            <Badge variant="success">WCAG AA ready</Badge>
          </div>
        </Card>

        <section className="cvforge-shell__grid" aria-label="Design system foundations">
          <Card>
            <CardHeader>
              <CardTitle>Composants de base disponibles</CardTitle>
              <CardDescription>
                Les primitives suivent les conventions shadcn/ui et restent
                stylées via les tokens partagés du design system.
              </CardDescription>
            </CardHeader>
            <CardContent className="cvforge-shell__stack">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="ghost">
                Ghost
              </Button>
              <Badge>Accent</Badge>
            </CardContent>
            <CardFooter>
              <p className="cvforge-shell__meta">
                Palette ivoire, contrastes lisibles, et surfaces tactiles
                cohérentes sur mobile comme sur desktop.
              </p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formulaires accessibles</CardTitle>
              <CardDescription>
                Labels explicites, focus visibles, et champs confortables pour
                les étapes d&apos;onboarding et d&apos;édition.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="cvforge-shell__form">
                <div className="cvforge-shell__field">
                  <Label htmlFor="job-title">Poste ciblé</Label>
                  <Input id="job-title" placeholder="Ex. Product Designer" />
                </div>
                <div className="cvforge-shell__field">
                  <Label htmlFor="motivation">Résumé de motivation</Label>
                  <Textarea
                    id="motivation"
                    placeholder="Décrivez votre angle de candidature."
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button variant="secondary">Préremplir depuis le profil</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patterns mobile-first</CardTitle>
              <CardDescription>
                Le shell reste en colonne unique par défaut et s&apos;ouvre en
                grille dès la tablette.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="cvforge-shell__list">
                <li>Actions prioritaires groupées au-dessus de la ligne de flottaison</li>
                <li>Champs pleine largeur avec libellés associés</li>
                <li>Cards réutilisables pour dashboard, onboarding et landing</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </section>
    </main>
  );
}
