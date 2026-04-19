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

export type ShellNavItem = {
  href: string;
  label: string;
  description: string;
  shortLabel?: string;
  isActive?: boolean;
};

type AppShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  navigation: ShellNavItem[];
  children?: React.ReactNode;
};

const defaultSections = (
  <section className="cvforge-shell__grid" aria-label="Design system foundations">
    <Card>
      <CardHeader>
        <CardTitle>Composants de base disponibles</CardTitle>
        <CardDescription>
          Les primitives suivent les conventions shadcn/ui et restent stylées
          via les tokens partagés du design system.
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
          Palette ivoire, contrastes lisibles, et surfaces tactiles coherentes
          sur mobile comme sur desktop.
        </p>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Formulaires accessibles</CardTitle>
        <CardDescription>
          Labels explicites, focus visibles, et champs confortables pour les
          etapes d&apos;onboarding et d&apos;edition.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="cvforge-shell__form">
          <div className="cvforge-shell__field">
            <Label htmlFor="job-title">Poste cible</Label>
            <Input id="job-title" placeholder="Ex. Product Designer" />
          </div>
          <div className="cvforge-shell__field">
            <Label htmlFor="motivation">Resume de motivation</Label>
            <Textarea
              id="motivation"
              placeholder="Decrivez votre angle de candidature."
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Preremplir depuis le profil</Button>
      </CardFooter>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Patterns mobile-first</CardTitle>
        <CardDescription>
          Le shell reste en colonne unique par defaut et s&apos;ouvre en grille
          des la tablette.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="cvforge-shell__list">
          <li>Actions prioritaires groupees au-dessus de la ligne de flottaison</li>
          <li>Champs pleine largeur avec libelles associes</li>
          <li>Cards reutilisables pour dashboard, onboarding et landing</li>
        </ul>
      </CardContent>
    </Card>
  </section>
);

function NavigationList({
  items,
  className,
}: {
  items: ShellNavItem[];
  className: string;
}) {
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.href}>
          <a
            aria-current={item.isActive ? "page" : undefined}
            className="cvforge-shell__nav-link"
            href={item.href}
          >
            <span className="cvforge-shell__nav-label">{item.label}</span>
            <span className="cvforge-shell__nav-description">
              {item.description}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function MobileNavigation({ items }: { items: ShellNavItem[] }) {
  return (
    <nav
      aria-label="Sections principales"
      className="cvforge-shell__mobile-nav"
    >
      <ul className="cvforge-shell__mobile-nav-list">
        {items.map((item) => (
          <li key={item.href}>
            <a
              aria-current={item.isActive ? "page" : undefined}
              className="cvforge-shell__mobile-nav-link"
              href={item.href}
            >
              <span className="cvforge-shell__mobile-nav-kicker">
                {item.shortLabel ?? item.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="cvforge-shell__mobile-nav-label">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({
  title,
  description,
  eyebrow = "CVforge · Papier & Crayon",
  navigation,
  children,
}: AppShellProps) {
  return (
    <main className="cvforge-shell" style={paperTokenCssVars()}>
      <section className="cvforge-shell__frame">
        <aside className="cvforge-shell__sidebar">
          <div className="cvforge-shell__sidebar-header">
            <Badge className="cvforge-shell__eyebrow" variant="outline">
              {eyebrow}
            </Badge>
            <p className="cvforge-shell__sidebar-copy">
              Shell partage pour landing, app et futurs parcours authentifies.
            </p>
          </div>
          <nav aria-label="Navigation principale" className="cvforge-shell__sidebar-nav">
            <NavigationList
              className="cvforge-shell__sidebar-nav-list"
              items={navigation}
            />
          </nav>
        </aside>

        <section className="cvforge-shell__main">
          <Card className="cvforge-shell__hero">
            <Badge className="cvforge-shell__eyebrow" variant="outline">
              {eyebrow}
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

          {children ?? defaultSections}
        </section>
      </section>

      <MobileNavigation items={navigation} />
    </main>
  );
}
