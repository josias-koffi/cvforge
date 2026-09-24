---
tags: [run/analyze-design-dev-review-20260924164112, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924164112/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924164112/04-review]]"
---
### Verdict: PASS
### Changements (apps/landing uniquement)
- **Registre** `lib/tools.ts` : `freeTools` (clé, chemin, icône) et `toolsPath`. Le type `FreeToolKey` (`content/types.ts`) ne contient que `"ats"`.
- **Routage** :
  - `toolsSlugs` dans `lib/i18n.ts`, traduit par `localizedPath` ;
  - `next.config.ts` : réécriture `/fr/outils` → `/fr/tools`, redirections `/fr/tools` et `/en/outils`.
- **Page** `app/[locale]/tools/page.tsx` :
  - `pageMetadata()` avec canonical et hreflang ;
  - JSON-LD `toolsStructuredData` (`ItemList` de `WebApplication` gratuites) ;
  - rendu par `components/tools-page.tsx`.
- **Composants** :
  - `components/tools/free-tool-grid.tsx`, carte à lien étiré et grille centrée quand il n'y a qu'un outil ;
  - `components/sections/free-tools.tsx`, section home insérée après `HowItWorks`.
- **En-tête** : le lien visible « Test ATS gratuit » devient « Outils gratuits », toujours 3 entrées. Pied de page et menu mobile ont les deux liens.
- **Sitemap** : hub en priorité 0,7.
- **Contenu** : `nav.tools` et bloc `tools` en FR/EN, parité vérifiée par le test existant.
### Correctif pendant le contrôle visuel
Les étiquettes `muted-foreground` sur `bg-muted` donnaient 4,27:1 en clair. Elles passent en bordure sur fond de carte : 4,75:1 en clair, 6,75:1 en sombre.
### Tests
- **Nouveau** `lib/tools.test.ts` :
  - chaque outil listé a son dossier de route, ce qui garantit qu'aucun outil non livré n'apparaît ;
  - aucune entrée de dictionnaire sans outil ;
  - sitemap et alternates.
- **Étendus** :
  - `next-config.test.ts` (redirections et réécriture) ;
  - `structured-data.test.ts` ;
  - `home-page.test.tsx` : position de la section, hub avec un seul h1, liens d'en-tête et de pied de page.
- **Résultats** : landing 159/159 (+14), tsc OK, eslint 0 avertissement, Prettier OK sur les fichiers neufs.
- **Build Next** : `/fr/tools` et `/en/tools` sont prérendues. En `next start` :
  - `/fr/outils` et `/en/tools` répondent 200 ;
  - `/fr/tools` et `/en/outils` répondent 308 ;
  - JSON-LD, hreflang et sitemap sont présents.
### Tailles
Tous les fichiers touchés font moins de 300 lignes, sauf `content/*.ts` (dictionnaires, exemptés comme avant).
