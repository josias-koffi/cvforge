# SPIKE-004 — Import PDF d'offre et connexion sociale Google/LinkedIn

**Date**: 2026-05-07
**Sprint**: 015 / US-052
**Agent**: analyst + tech-lead
**Workflow**: spike-research-20260507120000

---

## 1. Import PDF d'offre

### Décision : PROCEED — approche hybride V2.0

**Implémentation proposée** :
1. Upload PDF → stockage temporaire MinIO
2. BullMQ job `pdf-extract`:
   - Tentative locale via `pdfjs-dist` (gratuit, RGPD-safe)
   - Si résultat < 100 tokens → rasterisation → Mistral vision (fallback)
3. Stocker texte extrait dans `candidature.offerRawText`
4. Supprimer le fichier MinIO immédiatement après extraction

**Dépendance requise** : `pdfjs-dist` → **ADR-006 obligatoire**

**Contraintes** :
- Taille max : 5 MB (≤ 50 pages)
- Aucune donnée personnelle du candidat dans le PDF soumis à Mistral (§15)
- Suppression immédiate post-extraction (RGPD)

**Unknowns résiduels** :
- PDF scannés sans couche texte → uniquement résolubles via Mistral vision (coût tokens)
- Limite opérationnelle sur PDFs très longs (> 10 pages) à tester en staging

---

## 2. Connexion sociale Google/LinkedIn

### Décision : PROCEED — Passport.js V2.0

**Stack retenue** : `passport-google-oauth20` + `passport-linkedin-oauth2` dans NestJS. Le passwordless reste disponible en parallèle.

**Sécurité** :
- PKCE obligatoire (code_challenge/code_verifier)
- Scopes LinkedIn minimaux : `r_emailaddress` + `r_liteprofile`
- Régénération token après OAuth callback (anti-session fixation)
- Compte linkage par email : merge auto si email connu, sinon confirmation utilisateur

**RGPD** :
- Transfert US : SCC avec Google LLC et Microsoft (LinkedIn) → standard industrie
- Endpoint révocation token requis avant déploiement
- Mention politique de confidentialité obligatoire
- Données collectées : email + nom d'affichage uniquement

**Dépendance requise** : ADR-007 obligatoire (§5 engineering-standards)

---

## 3. Next actions

| Action | Priorité | Sprint cible |
|---|---|---|
| Créer ADR-006 (pdfjs-dist) | Avant implémentation | V2.0 sprint à planifier |
| Créer ADR-007 (social login Passport.js) | Avant implémentation | V2.0 sprint à planifier |
| Story backend : POST /candidatures/:id/offer-pdf | V2.0 | sprint 017+ |
| Story auth : OAuth2 Google + LinkedIn | V2.0 | sprint 017+ |
| Mettre à jour politique de confidentialité | Avec social login | sprint 017+ |
