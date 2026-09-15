# CVSpark — Design system

Palette retenue : **Étincelle électrique** (bleu tech comme couleur de marque, amber réservé aux moments de "déclic"). Compatible avec les variables CSS shadcn/ui utilisées par `apps/web` (ADR-008) — chaque token ci-dessous a son équivalent `--variable` shadcn.

---

## 1. Couleurs

### Marque

| Rôle | Hex | Usage |
|---|---|---|
| Primaire (bleu) | `#2D5FFF` | Boutons primaires, liens, header, focus ring |
| Primaire — hover | `#254DDB` | État hover/active du primaire |
| Accent spark (amber) | `#FFB020` | Réservé aux moments de "déclic" : CTA de génération IA, confirmation, micro-animations. Ne pas utiliser comme couleur d'UI générique. |
| Accent spark — hover | `#E89D14` | Hover de l'accent |

### Neutres

| Rôle | Hex (light) | Hex (dark) |
|---|---|---|
| Fond page | `#F7F8FA` | `#0B1220` |
| Fond carte / surface | `#FFFFFF` | `#141B2E` |
| Bordure | `#E2E5EA` | `#25304A` |
| Texte principal | `#111827` | `#F3F4F6` |
| Texte secondaire | `#6B7280` | `#9CA3AF` |
| Texte discret / placeholder | `#9CA3AF` | `#6B7280` |

### Sémantique

| Rôle | Hex | Usage |
|---|---|---|
| Succès | `#16A34A` | Candidature envoyée, action confirmée |
| Attention | `#D97706` | Solde de crédits bas, alerte non bloquante |
| Erreur | `#DC2626` | Échec de génération, formulaire invalide |
| Info | `#2563EB` | Bandeaux d'information neutre |

### Mapping vers les variables shadcn/ui

```css
--background: #F7F8FA;
--foreground: #111827;
--card: #FFFFFF;
--card-foreground: #111827;
--primary: #2D5FFF;
--primary-foreground: #FFFFFF;
--secondary: #EEF1F6;
--secondary-foreground: #111827;
--muted: #EEF1F6;
--muted-foreground: #6B7280;
--accent: #FFB020;
--accent-foreground: #111827;
--destructive: #DC2626;
--destructive-foreground: #FFFFFF;
--border: #E2E5EA;
--input: #E2E5EA;
--ring: #2D5FFF;
```

Règle d'usage : `--accent` (amber) est déclenché ponctuellement (bouton "Générer le CV", badge "Nouveau", état de succès de génération) — jamais comme couleur de navigation ou de fond dominant. Le bleu (`--primary`) porte l'identité au quotidien.

---

## 2. Typographie

**Police unique : Inter** (fallback système : `system-ui, -apple-system, sans-serif`). Sans-serif moderne, très lisible en petite taille, déjà proche des standards shadcn/ui — pas de police additionnelle à charger pour les usages secondaires.

```css
--font-sans: "Inter", system-ui, -apple-system, sans-serif;
```

### Échelle

| Style | Taille | Line-height | Weight | Usage |
|---|---|---|---|---|
| Display | 40px / 2.5rem | 1.1 | 600 | Hero landing uniquement |
| H1 | 32px / 2rem | 1.2 | 600 | Titre de page |
| H2 | 24px / 1.5rem | 1.3 | 600 | Titre de section |
| H3 | 18px / 1.125rem | 1.4 | 500 | Sous-section, titre de carte |
| Body | 16px / 1rem | 1.6 | 400 | Texte courant |
| Small | 14px / 0.875rem | 1.5 | 400 | Labels, métadonnées, texte secondaire |
| Caption | 12px / 0.75rem | 1.4 | 400 | Légendes, timestamps |

### Règles

- Deux graisses seulement en usage courant : **400** (texte) et **500/600** (titres, boutons). Éviter le 700 — trop lourd sur de l'interface.
- Casse : phrase normale partout (boutons, titres, labels) — jamais de Title Case ni de MAJUSCULES, sauf sigles (CV, ATS, PDF).
- Les CV/LM générés (contenu du document, pas l'UI) gardent leur propre typographie de sortie PDF/DOCX — indépendante de cette charte, qui ne régit que le produit (landing + app).

---

## 3. Spacing & radius

Base 4px, échelle en puissances de 4/8 :

| Token | Valeur | Usage |
|---|---|---|
| `space-1` | 4px | Espacement interne fin (icône + label) |
| `space-2` | 8px | Padding compact, gap entre éléments proches |
| `space-3` | 12px | Padding de carte, gap standard |
| `space-4` | 16px | Padding de section, marge de formulaire |
| `space-6` | 24px | Espacement entre blocs |
| `space-8` | 32px | Marge de section large |
| `space-12` | 48px | Séparation de grandes zones (landing) |
| `space-16` | 64px | Hero, séparation de sections landing |

### Radius

| Token | Valeur | Usage |
|---|---|---|
| `radius-sm` | 6px | Inputs, badges, petits boutons |
| `radius-md` | 10px | Boutons standards, champs de formulaire |
| `radius-lg` | 16px | Cartes, modales |
| `radius-full` | 9999px | Pills, avatars, badge de statut |

```css
--radius: 0.625rem; /* 10px — valeur par défaut shadcn/ui, cohérente avec radius-md */
```

---

## 4. Iconographie

- Bibliothèque : **Lucide** (déjà utilisé par `apps/web` via shadcn/ui — pas de nouvelle dépendance).
- Style : trait fin, `stroke-width: 1.75`, jamais d'icônes pleines ("filled").
- Tailles : 16px (inline avec texte small), 20px (standard UI, boutons), 24px (titres de section, empty states).
- Couleur : hérite du texte environnant par défaut (`currentColor`) ; coloré uniquement pour porter un état sémantique (succès, erreur, attention) — jamais l'amber d'accent comme couleur d'icône générique.
- Pas de mascotte, pas d'illustration cartoon — cohérent avec le ton "moderne/tech" déjà acté pour le storytelling.

---

## 5. Dark mode

Le dark mode inverse les surfaces mais garde le bleu de marque quasi identique (ajusté pour le contraste) ; l'amber est légèrement désaturé pour éviter l'effet néon sur fond sombre.

| Rôle | Light | Dark |
|---|---|---|
| Fond page | `#F7F8FA` | `#0B1220` |
| Surface / carte | `#FFFFFF` | `#141B2E` |
| Bordure | `#E2E5EA` | `#25304A` |
| Primaire | `#2D5FFF` | `#5B82FF` (éclairci pour le contraste sur fond sombre) |
| Accent spark | `#FFB020` | `#F0A73E` (légèrement désaturé) |
| Texte principal | `#111827` | `#F3F4F6` |
| Texte secondaire | `#6B7280` | `#9CA3AF` |

Règle : ne jamais garder une couleur "light" telle quelle en dark mode sans vérifier son contraste (cible WCAG AA ≥ 4.5:1 pour le texte, ≥ 3:1 pour les éléments UI larges — cohérent avec les Engineering Standards du projet, §6).

---

## 6. Logo / wordmark

- Traitement : wordmark texte, pas de pictogramme obligatoire pour la V1 (cohérent avec l'objectif démo — pas de temps à investir dans un mark distinct pour l'instant).
- Composition : `CV` en texte principal (couleur `--foreground` / blanc sur fond sombre) + `Spark` en couleur primaire `#2D5FFF`, même graisse (600), pas de séparateur.
- Variante "étincelle" optionnelle : un point ou une petite forme d'éclair (glyphe Lucide `zap` ou trait simple) accolé au wordmark, en amber `#FFB020` — à utiliser uniquement en favicon ou en avatar d'app, jamais dans le wordmark texte complet du header.
- Espace de protection minimal : la hauteur du "C" de chaque côté du wordmark.
- À éviter : dégradé sur le nom, ombre portée, italique, changement de casse (jamais "CVSPARK" ni "cvspark" en usage de marque — toujours "CVSpark").
- Favicon : simplifier à l'initiale "S" ou à la forme d'éclair seule, sur fond `--primary`.

---

## Ce qui manque encore (à trancher ensemble)

- **Composants clés** : boutons (variants primary/secondary/ghost/destructive), badges de statut de candidature (Brouillon/Envoyée/Entretien/Refus/Offre), états de formulaire (erreur, focus, disabled) — utile avant de designer les écrans /offers, /cv, /credits.
- **Grille & breakpoints** : le produit est desktop-first (ADR-008) — faut-il documenter des breakpoints (ex. 1024px, 1280px, 1536px) et une largeur de contenu max pour la landing et le dashboard ?
- **Imagerie / illustration de la landing** : captures d'écran réelles du produit, illustration abstraite liée à l'étincelle, ou rien (texte + UI seule) ?
- **Motion** : durée/easing des transitions (utile pour l'animation de "génération" qui doit incarner l'étincelle — ex. un flash bref sur le bouton au moment où le CV est prêt).
- **Data viz** : le dashboard a des graphiques (recharts, déjà dans le stack v2) — faut-il une palette dédiée aux graphiques, distincte de l'UI ?

Dis-moi lesquels tu veux traiter maintenant et je les ajoute au fichier.
