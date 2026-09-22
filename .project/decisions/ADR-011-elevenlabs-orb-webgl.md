# ADR-011 — L'orbe de l'entretien : composant ElevenLabs UI (WebGL)

- **Statut** : accepté
- **Date** : 2026-09-21
- **Portée** : `apps/web` — studio d'entretien (`/entretiens/[sessionId]`)

## Contexte

Le studio d'entretien a besoin d'une représentation visuelle de la voix : qui a
la parole, et avec quelle énergie. Une première version maison (SVG + keyframes
CSS, trois ellipses floutées pilotées par le niveau audio) a été livrée puis
rejetée à la revue — trop plate, pas assez vivante.

Le propriétaire a demandé explicitement le composant
[`Orb` d'ElevenLabs UI](https://ui.elevenlabs.io/docs/components/orb), une
sphère 3D animée par shader, conçue précisément pour les agents vocaux.

## Décision

Vendorer le composant `Orb` d'ElevenLabs UI dans `components/ui/orb.tsx` et
l'envelopper dans `components/interview/studio/voice-orb.tsx`.

Nouvelles dépendances dans `apps/web` :

| Paquet                | Version | Pourquoi                          |
| --------------------- | ------- | --------------------------------- |
| `three`               | ^0.186  | moteur WebGL                      |
| `@react-three/fiber`  | ^9.7    | réconciliateur React pour three   |
| `@react-three/drei`   | ^10.7   | `useTexture` (chargement texture) |
| `@types/three` (dev)  | ^0.186  | typage                            |

## Conséquences

### Ce que ça coûte

- **Poids** : le chunk qui embarque three.js pèse 908 Ko bruts, **240 Ko
  gzip** (mesuré sur le build du 2026-09-21). Il n'est chargé que par la route
  du studio : aucune autre page n'importe `VoiceOrb`, et Next découpe par
  route.
- **Règles React Compiler** : le composant pilote son shader en mutant des
  uniforms à chaque frame, ce que `react-hooks/{purity,immutability,refs,
  preserve-manual-memoization}` interdisent. Les règles sont désactivées pour
  ce seul fichier dans `eslint.config.mjs`, avec la justification en
  commentaire. Le réécrire le forkerait d'amont sans gain de comportement.
- **Code tiers** : ne pas modifier `components/ui/orb.tsx`. Tout ce qui est
  nôtre vit dans `voice-orb.tsx` et `lib/interview/orb.ts`.

### Écarts assumés par rapport à l'amont

1. **Texture servie en local.** Le composant charge sa texture de bruit de
   Perlin depuis le CDN d'ElevenLabs
   (`storage.googleapis.com/eleven-public-cdn`). Copiée dans
   `public/perlin-noise.png` : un entretien ne doit pas dépendre d'un tiers, et
   rien de la session de nos utilisateurs n'a à transiter par lui.
2. **`volumeMode="manual"`.** Le mode `auto` fabrique une sinusoïde qui a l'air
   d'une voix sans en être une. Nous fournissons les vrais niveaux : le micro du
   candidat (analyseur VAD) et la voix du recruteur (analyseur ajouté au lecteur
   audio). C'est tout l'intérêt de l'orbe ici.
3. **Import statique.** `next/dynamic` avec `ssr: false` empêchait la boucle de
   rendu de démarrer : le canvas se montait à la bonne taille, mais restait
   totalement transparent (`uOpacity` jamais incrémenté, la frame ne tournait
   pas). Vérifié à l'écran, dans les deux sens. L'import est donc statique.
4. **Palette en hexadécimal.** Un shader ne lit pas une custom property oklch.
   `voice-orb.tsx` porte des teintes des tokens CVSpark, en clair et en sombre :
   un changement de palette dans `globals.css` doit y être reporté à la main.
   Les tokens bruts (`--primary` saturé) donnaient un moulin à vent cobalt ; ce
   sont leurs versions claires qui donnent l'aspect nuageux.
5. **Résolution plafonnée, antialiasing coupé** (`dpr={[1, 1.5]}`,
   `antialias: false`). Aux valeurs d'amont, une sphère de 224 px est rendue au
   device pixel ratio complet — 3× sur un écran retina, soit neuf fois le
   travail de fragment — avec un tampon multi-échantillonné par-dessus, soixante
   fois par seconde. Sur un GPU modeste la page entière tombait avec, et le
   micro devenait sourd : le VAD échantillonnait alors quelques millisecondes
   d'audio tous les cinquièmes de seconde. La sphère est masquée en cercle et
   ne montre jamais d'arête franche, donc l'antialiasing n'achetait rien.

   **La cause profonde n'était pas l'orbe.** Elle était que la détection de
   parole lisait le micro dans `requestAnimationFrame`, avec une fenêtre
   d'analyse de 5,3 ms : une horloge de rendu pilotait ce que le micro
   entendait. Corrigé côté VAD (minuterie de 25 ms, fenêtre de 43 ms), et ce
   plafond reste parce qu'aucune interface n'a besoin de neuf fois les pixels
   qu'elle affiche.

### Accessibilité

- La sphère est `aria-hidden` ; l'état est écrit sous elle et annoncé en
  `aria-live="polite"` (WCAG 1.4.1 — jamais la couleur seule).
- `prefers-reduced-motion` : la boucle de rendu WebGL ignore la règle CSS
  globale de `globals.css`. `usePrefersReducedMotion` la remplace par un dégradé
  statique aux mêmes couleurs.

### Amont

Le composant a été récupéré le 2026-09-21 depuis
`elevenlabs/ui@main:apps/www/registry/elevenlabs-ui/ui/orb.tsx` (MIT). Pour le
mettre à jour : reprendre le fichier amont, puis réappliquer l'écart n°1 (la
texture locale) — c'est le seul.
