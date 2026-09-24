<!-- generated-by: plan « Outils gratuits d'acquisition » (demande propriétaire 2026-09-24) — brouillon -->

# Sprint 029 — Mesurer le tunnel, puis un deuxième outil gratuit : le comparateur CV ↔ offre

## 🎯 Sprint Goal

Épic **E23 — Outils gratuits d'acquisition**. Poser le socle commun à tous les outils gratuits de
la landing (mesure du tunnel, rate limit par route, conversion par email avec pré-remplissage),
corriger les fuites du tunnel ATS, et livrer le premier nouvel outil : le comparateur CV ↔ offre.

> ⚠️ Absent de `.project/vision.md`. Décision produit du 2026-09-24. À reporter par le Product
> Owner, jamais en auto-édition.

> ⚠️ **Brouillon.** Période à fixer. Constat de départ (sprint-024) : 7 scans, 3 déverrouillages,
> 0 lead converti, et aucune mesure côté front. D'où l'ordre : mesurer d'abord.

## ✅ Tasks

- [x] **[US-131]** Événements de tunnel côté API
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Table `acquisition_events` : outil, étape, locale, `ip_hash`, date. Aucune IP brute,
          aucun email, aucun texte libre.
    - [x] `POST /public/events` appelée par la landing via une route BFF, bornée par des valeurs
          fermées et un dédoublonnage par jour, outil, étape et `ip_hash` (amendé le 2026-09-24 :
          le rate limit par route n'existe qu'avec US-132, qui l'applique à cette route).
    - [x] Étapes : `view`, `result`, `cta_click`, `email_submitted` ; l'activation du compte se
          lit par jointure sur l'email, comme `readAtsCounters` (`metrics.pg-store.ts`).
    - [x] Tunnel par outil dans `/admin/metrics`, ATS inclus.
- [x] **[US-132]** Rate limit générique par route publique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] `rate-limit.middleware.ts` et `rate-limit.config.ts` prennent une clé de budget global
          et des limites par route ; une route s'ajoute par configuration dans `app.module.ts`.
    - [x] L'ATS garde ses variables `ATS_*` et son comportement, prouvé par ses tests actuels.
    - [x] Tests à timers simulés, aucun `sleep`. ADR-022 amendée si le contrat change.
    - [x] `POST /public/events` (US-131) est enregistrée dans le rate limit, avec ses propres
          limites.
    - [x] La landing lit l'IP du visiteur dans un en-tête configurable (`CLIENT_IP_HEADER`),
          `cf-connecting-ip` en production derrière Cloudflare (revue US-131, scindé le 2026-09-24 :
          la vérification en production passe au DoD du sprint).
    - [x] La landing relaie l'IP du visiteur à l'API dans un en-tête signé (`LANDING_PROXY_SECRET`),
          seul cru par l'API : Traefik écrase `X-Forwarded-For` sur le domaine public (revue US-132,
          décision du propriétaire le 2026-09-24).
- [x] **[US-133]** Service « lead » générique
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Extrait de `ats-unlock.service.ts` : email + consentement explicite → magic link, réponse
          identique qu'un compte existe ou non.
    - [x] Accepte une intention de pré-remplissage typée (offre, ROME + lieu, SIREN, scan ATS),
          appliquée à la première connexion, expirée avec le magic link.
    - [x] Aucun texte de CV dans l'intention (règle RGPD d'E18).
    - [x] L'ATS est migré sur ce service ; son scan se retrouve dans l'app après inscription.
- [x] **[US-134]** Correctifs du tunnel ATS
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] La landing envoie `locale` (`lib/ats-client.ts`) ; un scan fait depuis `/en/…` est
          stocké en `en`.
    - [x] Les erreurs sont traduites côté landing à partir d'un code, plus de message français sur
          la version EN.
    - [x] Lien vers l'outil depuis le Hero et depuis la section CTA de la home.
    - [x] `ats-checker.tsx` (317 lignes) redescend sous 300, et le branchement des 4 événements
          d'US-131 est testé (revue US-131).
- [x] **[US-135]** Hub « Outils gratuits »
  - Agent: `designer` puis `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] Page `/fr/outils` et `/en/tools` (slugs dans `lib/i18n.ts`, rewrites dans
          `next.config.ts`), sitemap, `pageMetadata()`, JSON-LD.
    - [x] Entrée de menu dans `site-header.tsx` et section sur la home.
    - [x] Les outils pas encore livrés n'apparaissent pas.
- [x] **[US-136]** Comparateur CV ↔ offre
  - Agent: `developer`
  - Workflow: `analyze-design-dev-review`
  - Critères d'acceptation :
    - [x] `POST /public/keyword-match` : CV PDF/DOCX + texte d'offre ; réutilise `extractCvText`
          sans OCR et `packages/ats-score` (`extractKeywords`, dimension `keywords`).
    - [x] 0 appel LLM, prouvé par test ; CV jamais persisté.
    - [x] Résultat : taux de couverture, mots-clés présents et manquants.
    - [x] CTA « Générer un CV adapté à cette offre » → service lead (US-133) ; après inscription,
          la candidature existe avec le texte de l'offre, sans crédit consommé.
    - [x] À trancher au design : page dédiée ou onglet de la page ATS (qui accepte déjà une offre).
  - Découpage obligatoire (story `L`) : API d'abord, page ensuite.

Critères communs aux outils : voir `backlog.md`, « Critères d'acceptation détaillés — E23 ».

## 📊 Sprint DoD

- [x] All tasks ticked
- [x] All acceptance criteria verified
- [x] `run-tests` green
- [x] QA review
- [x] Gate mesure : le tunnel ATS et celui du comparateur sont lisibles dans `/admin/metrics`
- [x] Gate RGPD : aucune ligne écrite ne contient de texte de CV (test d'intégration)
      → `apps/api/src/leads/public-tools.rgpd.test.ts` : tous les outils de bout en bout sur Postgres
      (PGlite), puis relecture de chaque table ; une fuite injectée est bien détectée.
- [ ] Exploitation : en production, l'en-tête `CF-Connecting-IP` arrive à la landing et l'origine
      n'accepte que Cloudflare ; Traefik (Dokploy) ne déclare ni `trustedIPs` ni `insecure` (US-132)
- [ ] Exploitation : le secret GitHub `LANDING_PROXY_SECRET` est créé (production et staging), et
      un scan depuis deux IP différentes compte sur deux compteurs distincts (US-132)

## 🔁 Workflow Runs
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924143552|analyze-design-dev-review]] (US-131) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924145528|analyze-design-dev-review]] (US-132) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924155415|analyze-design-dev-review]] (US-133) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924162332|analyze-design-dev-review]] (US-134) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924164112|analyze-design-dev-review]] (US-135) — passed
- 2026-09-24 — [[workflows/runs/analyze-design-dev-review-20260924173554|analyze-design-dev-review]] (US-136) — passed
