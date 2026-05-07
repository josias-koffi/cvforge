# Stage 1 — Frame

**Agent**: Analyst
**Date**: 2026-05-07
**Task**: US-052

## Research Questions

### Q1 — Import PDF d'offre
> Dans le périmètre V2.0, comment intégrer l'import PDF d'offre d'emploi comme fallback au scraping, en s'appuyant sur la capacité vision/multimodale déjà disponible (Mistral Small 4) ?

**Why it matters**: La vision §7 note explicitement "Fallback PDF (si faisable en MVP)" mais décide de reporter à V2.0 (§16). Il faut décider s'il s'agit d'un upload → extraction texte, ou d'un upload → rasterisation → vision model.

**Time box**: 60 min research.

**Constraints**:
- Doit rester dans le périmètre V2.0 défini par §16
- Mistral Small 4 est multimodal (vision) — les PDF sont déjà rasterisés côté backend pour d'autres usages (§2 stack)
- MinIO stocke déjà les PDF (§15.4)
- Aucune donnée personnelle sensible ne doit transiter vers l'API Mistral (§2)

### Q2 — Connexion sociale Google/LinkedIn
> Dans le périmètre V2.0, quels sont les impacts sécurité et RGPD de l'ajout de OAuth2 (Google + LinkedIn) en complément du passwordless existant, et quel provider OAuth est le plus adapté à l'architecture NestJS/Next.js actuelle ?

**Why it matters**: La vision §3.1 est explicite — passwordless uniquement en MVP, connexion sociale à évaluer en V2. L'évaluation doit couvrir: risques RGPD (transfert UE/hors-UE), risques sécurité (session hijacking, token leakage), et effort d'intégration.

**Time box**: 60 min research.

**Constraints**:
- Le système passwordless est actif et doit rester disponible (pas de remplacement)
- Contraintes RGPD EU strictes (§15)
- Stack: NestJS backend + Next.js frontend
- Ne pas introduire un nouveau auth provider sans ADR (§5 engineering-standards)

## Pass Criteria

- [x] Questions de recherche spécifiques et délimitées
- [x] Time box explicite (60 min par question)
- [x] Contraintes vision sourcées
