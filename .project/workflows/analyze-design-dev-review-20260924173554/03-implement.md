---
tags: [run/analyze-design-dev-review-20260924173554, agent/developer, stage/implement]
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924173554/02-design]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924173554/04-review]]"
---
### Verdict: PASS
### Tranche 1 — API
- **`packages/ats-score`** : `matchOfferKeywords` et `offerTerms`. La dimension `keywords` partage désormais `offerTerms`, à vocabulaire identique : pas de montée de version. Les verbes en « -ez » ne sont filtrés que dans le comparateur.
- **`packages/types`** :
  - outil `keyword_match` ;
  - codes `OFFER_TEXT_REQUIRED` et `OFFER_NOT_USABLE` ;
  - `leadIntentPath(offer)` = `/candidatures` ;
  - `PublicKeywordMatchResponse`.
- **Module `keyword-match/`** (service sans dépendance, contrôleur, module qui n'importe que `LeadsModule`) :
  - `POST public/keyword-match` : 200, ou refus codés ;
  - `POST public/keyword-match/lead` : 202, même réponse que le compte existe ou non.
- **Rate limit** : politiques `keyword-match` et `keyword-match-lead` (ADR-022 amendé).
- **Candidatures** :
  - `offer-structuring.ts` extrait du service (767 → 669 lignes) ;
  - `importOfferedText` (aucun débit, repli sur le texte seul) ;
  - `LeadOfferListener`, étiquette `LEAD_OFFER_SOURCE_LABEL`.
- **Métriques** : `readKeywordMatchActivations`, tunnel `keyword_match` et libellé dans le web.
- **Tests** : le constructeur de PDF de test est déplacé dans `ats/testing/build-pdf.ts`, partagé avec le scan.
### Tranche 2 — landing
- **Page** `/fr/comparateur-cv-offre` · `/en/cv-job-match` : réécriture, redirections, slug traduit, `pageMetadata()`, sitemap construit depuis `freeTools`.
- **Hub** : entrée `keyword_match` au registre, donc carte sur le hub et la home.
- **`lib/bff.ts`** (`relayUpload`, `relayJson`) : les deux routes ATS en dépendent désormais. Nouvelles routes `api/keyword-match` et `api/keyword-match/lead`.
- **Généralisations** : `toolFunnel(tool)`, `EmailConsentForm` (`UnlockForm` devient une enveloppe), `callBff` exporté, `ScoreGauge` qui ne prend que le texte de la jauge.
- **Composants** : `KeywordMatchTool` et `KeywordMatchResult`. Dictionnaire `keywordMatch` en FR/EN et deux codes d'erreur de plus.
### Vérification réelle
- **API lancée à part (port 3998)** :
  - un PDF donne 200, avec 38 % de couverture, 5 termes présents et 8 manquants ;
  - une offre trop courte donne `OFFER_TEXT_REQUIRED`, un email invalide `INVALID_EMAIL` ;
  - le 6ᵉ appel lead dans l'heure reçoit un 429.
- **Build Next** : la page répond 200 et les redirections 308 ; le relais BFF fonctionne ; le sitemap est à jour.
- **Navigateur** : formulaire, puis résultat. Focus corrigé : un `useEffect` remplace le `requestAnimationFrame`, qui s'exécutait avant le montage du panneau.
### Tests
API 1885, landing 185, web 430, ats-score 156, types 34. Lint et tsc propres. Couverture des nouveaux fichiers API : 92 %.
