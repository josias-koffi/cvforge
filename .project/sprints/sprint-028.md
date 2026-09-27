<!-- generated-by: plan « API France Travail » (demande propriétaire 2026-09-23) — brouillon -->

# Sprint 028 — L'alternance de bout en bout, et les salons près de chez soi

## 🎯 Sprint Goal

Épic **E22 — Alternance et événements**. Un candidat en alternance trouve une offre, génère son CV
et l'envoie au recruteur **sans quitter CVForge**. Chaque candidat voit dans son digest les salons
et job datings proches, dans son métier.

> ⚠️ Absent de `.project/vision.md`. À reporter par le Product Owner, jamais en auto-édition.

> ⚠️ **Brouillon.** Dépend des sprints 026 (ROME) et 027 (collecte par ROME). Période à fixer.

## ✅ Tasks

- [ ] **[US-129]** Envoyer une candidature en alternance par l'API
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] Clé de **production** La bonne alternance obtenue. La clé sandbox interroge leur recette,
          voir sprint-025, lot 6.
    - [ ] Un consentement explicite est demandé à chaque envoi : le candidat voit ce qui part et à
          qui.
    - [ ] Le contenu envoyé est journalisé sur la candidature. Le statut de l'envoi est suivi dans
          le tableau de candidatures existant.
    - [ ] Envoi seulement pour les offres qui l'acceptent. Les autres gardent le lien d'origine.
  - À vérifier en direct : le contrat de l'endpoint d'envoi (champs, pièces jointes, taille), ses
    conditions d'usage, et s'il s'agit de l'API « Envoi d'une candidature à une opportunité d'emploi
    en alternance » du catalogue France Travail ou de celle d'apprentissage.beta.gouv.fr.
  - Question produit : l'envoi consomme-t-il un crédit en plus de la génération ? Par défaut, non.
- [ ] **[US-130]** Salons et job datings dans le digest
  - Agent: `developer`
  - Critères d'acceptation :
    - [ ] API Mes évènements emploi, collectée une fois par jour avec la passe du matin, et stockée
          en local.
    - [ ] Filtrés par distance et, si l'API le permet, par code ROME ou secteur.
    - [ ] Une section « Près de chez vous » dans la page et l'e-mail, seulement quand un événement
          correspond.
  - À vérifier en direct : champs (lieu, date, inscription, métiers), quotas et licence.

## 📊 Sprint DoD

- [ ] All tasks ticked
- [ ] All acceptance criteria verified
- [ ] `run-tests` green
- [ ] QA review
- [ ] Gate : aucun envoi sans consentement explicite, testé
