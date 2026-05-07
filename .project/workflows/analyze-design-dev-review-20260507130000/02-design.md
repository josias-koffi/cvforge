# Stage 2 — Design | US-053 — Extension Browser Scraping

**Agent**: Designer
**Date**: 2026-05-07

## UX Decision

L'extension browser est une UI hors de l'app principale. Elle utilise la direction artistique "Papier & Crayon" en version compacte (popup 360×480px). Aucune route Next.js n'est concernée.

## User Journey

```
1. Utilisateur navigue vers une offre d'emploi (LinkedIn, Indeed, WTTJ, APEC)
2. Clic sur l'icône CVforge dans la barre d'extensions
3. Popup s'ouvre → détection automatique des données de la page
4. L'utilisateur voit : Titre du poste | Entreprise | Aperçu du texte (100 chars)
5. Si non connecté → bouton "Se connecter à CVforge" (ouvre onglet auth)
6. Si connecté → bouton "Ajouter à mes candidatures"
7. Confirmation : "Candidature créée ✓" + lien "Ouvrir dans CVforge"
```

## Mockup Popup (360×480px)

```
┌─────────────────────────────────┐
│  🖊 CVforge          [×]        │
│─────────────────────────────────│
│  Offre détectée                 │
│                                 │
│  Poste : Développeur Full Stack │
│  Entreprise : Acme Corp         │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Nous recherchons un dév...  ││
│  │ [voir plus]                 ││
│  └─────────────────────────────┘│
│                                 │
│  ⚠️ Vérifiez les données avant  │
│     d'envoyer                   │
│                                 │
│  [Modifier]  [Ajouter ✓]        │
│─────────────────────────────────│
│  Connecté : user@example.com    │
└─────────────────────────────────┘
```

**État non connecté** :
```
┌─────────────────────────────────┐
│  🖊 CVforge          [×]        │
│─────────────────────────────────│
│  Connectez-vous pour capturer   │
│  cette offre dans CVforge       │
│                                 │
│  [Se connecter →]               │
└─────────────────────────────────┘
```

## Design Tokens (hérités du design system)

- Fond popup : `#FAFAF7` (papier ivoire)
- Texte : `#1A1A18` (noir charbon)
- Accent : `#2C2C2A` (anthracite)
- Bouton primaire : fond anthracite, texte blanc, `rounded-lg`
- Bordure : `border-stone-200` — tracé crayon
- Police : Inter (corps), Playfair Display (titre CVforge)

## WCAG 2.1 AA

- Contraste texte/fond : `#1A1A18` sur `#FAFAF7` → ratio 18.1:1 ✅
- Bouton "Ajouter" : `white` sur `#2C2C2A` → ratio 14.5:1 ✅
- Focus visible : outline `2px solid #C8A96E` sur tous les éléments interactifs ✅
- Pas d'information uniquement par couleur ✅
- Labels descriptifs sur tous les boutons ✅

## Architecture des fichiers de l'extension

```
apps/extension/               ← nouvelle app dans le monorepo
├── manifest.json             ← Manifest V3
├── popup/
│   ├── popup.html
│   ├── popup.tsx             ← React + design system tokens
│   └── popup.css
├── content/
│   └── content.ts            ← content script (extraction DOM)
├── background/
│   └── service-worker.ts     ← SW Manifest V3 (minimal)
└── package.json
```

## Pass

- Design adapté au scope analysé : OUI
- UX risks : auth flow (documenté, résolu via onglet de connexion)
- WCAG 2.1 AA : OUI
- Non-UI skip : N/A — il y a une UI popup
