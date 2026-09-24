---
tags: [run/analyze-design-dev-review-20260924155415, agent/product-owner, stage/analyze]
agent: "[[agents/product-owner/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924155415/task]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924155415/02-design]]"
---
### Verdict: PASS
### Périmètre
- **L'intention voyage avec le lien magique.** Nouvelle colonne `intent` (jsonb) sur `auth_magic_links`, migration 0041. Supprimée au clic ou à l'expiration, elle s'applique au compte qui clique, nouveau ou existant. Le hook `onAccountCreated` ne suffit pas : il ignore les comptes existants.
- **`LeadIntent`** dans `@cvforge/types`, validée à l'entrée :
  - `ats_scan` (uuid) ;
  - `offer` (texte d'offre, 8 000 caractères max) ;
  - `job_search` (code ROME + département) ;
  - `company` (SIREN).

  Aucun champ ne porte de texte de CV (règle d'E18).
- **Appliquée au clic** :
  - redirection vers l'écran qui prolonge l'outil (`/login/success?next=…`, chemin relatif validé côté web) ;
  - hook `onLeadIntent(email, intent)` pour les actions en base.

  Cette story ne livre que l'effet pour `ats_scan`. Les effets `offer`, `job_search` et `company` arrivent avec leur outil (US-136, US-137, US-139). Ces trois-là dépendent d'un profil ou d'un crédit, à trancher dans leur story.
- **`LeadCaptureService`** (module `leads/`) : contrôle de l'email et du consentement (400), puis envoi du lien sans jamais lever d'erreur. La réponse est donc la même qu'un compte existe ou non.
- **ATS migré** : l'unlock garde son contrat HTTP. La landing ne change pas.
- **Le scan dans l'app** :
  - `GET ats/scans` et `GET ats/scans/:id`, avec session : uniquement les scans débloqués avec l'email de la session et encore dans leurs 30 jours de rétention, 404 sinon ;
  - page web `/analyses-ats/[scanId]` (score, dimensions, points relevés, CTA) ;
  - lien depuis le tableau de bord quand il existe au moins un scan.
### Critères testables
Intention invalide refusée, lien sans intention inchangé, intention supprimée avec le lien, redirection vers le rapport, scan d'un autre email en 404, tests ATS existants verts.
### Question ouverte (non bloquante)
Le libellé des points relevés existe en FR dans la landing ; le web en aura une copie, comme `ATS_BAND_LABELS`.
