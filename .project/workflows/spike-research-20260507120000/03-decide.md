# Stage 3 — Decide

**Agent**: Tech Lead
**Date**: 2026-05-07
**Task**: US-052

---

## Decision 1 — Import PDF d'offre

**Outcome**: PROCEED (hybride, V2.0)

**Rationale**:
L'approche hybride (extraction locale `pdfjs-dist` en premier, rasterisation Mistral en fallback) est la seule option qui respecte simultanément les contraintes RGPD §15 et la capacité multimodale déjà en place. Elle est alignée avec la décision d'architecture US-019 qui a explicitement différé le PDF import pour cette raison.

**Architecture gate**:
- `pdfjs-dist` est une nouvelle dépendance → **ADR-006 obligatoire** avant toute implémentation
- Le job BullMQ `pdf-extract` s'intègre proprement dans la couche Infrastructure sans violer la clean architecture
- Suppression du fichier MinIO après extraction = conforme §15 (pas de rétention)
- Taille max à fixer à 5 MB dans le controller (validation boundary)

**Scope V2.0 confirmé** : Ce n'est pas un MVP feature — le fallback texte (US-019) couvre les besoins MVP.

---

## Decision 2 — Connexion sociale Google/LinkedIn

**Outcome**: PROCEED (avec conditions, V2.0)

**Rationale**:
Passport.js avec `passport-google-oauth20` + `passport-linkedin-oauth2` est l'approche la plus cohérente avec le NestJS backend existant. Elle n'introduit pas un nouveau auth framework (Auth.js est conçu pour Next.js uniquement et forcerait une architecture hybride complexe).

**Architecture gate**:
- OAuth2 est une modification du système d'authentification → **ADR-007 obligatoire** (§5 engineering-standards) avant implémentation
- Passwordless doit rester disponible en parallèle — ne pas le remplacer
- PKCE obligatoire pour Google (code_challenge/code_verifier)
- Scopes LinkedIn minimaux : `r_emailaddress` + `r_liteprofile` uniquement
- Endpoint de révocation token requis (droit à l'effacement §15)
- Mention dans la politique de confidentialité requise (transfert US via SCC)

**Scope V2.0 confirmé** : §3.1 est explicite — passwordless uniquement en MVP.

---

## ADRs à créer avant implémentation

| ADR | Sujet | Priorité |
|---|---|---|
| ADR-006 | pdfjs-dist comme extracteur PDF local | Requise avant US-052 impl |
| ADR-007 | Social login OAuth2 (Google + LinkedIn) via Passport.js | Requise avant story OAuth2 |

---

## Pass Criteria

- [x] Outcome est proceed/reject/defer avec rationale explicite
- [x] Contraintes architecture sourcées (engineering-standards §5)
- [x] Next action unambiguous
