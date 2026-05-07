# Task: US-064 — Refondre l'Interview Studio avec VAD automatique

Sprint: 017
Workflow: analyze-design-dev-review
Run-id: analyze-design-dev-review-20260507170000

## Description
Supprimer le bouton push-to-talk manuel et remplacer par un VAD AnalyserNode actif dès l'entrée en session. Refonte UX du studio d'entretien avec transcript défilant, timer de session et bouton "Fin de session" repositionné en haut.

## Acceptance Criteria
- [ ] Le bouton push-to-talk manuel est supprimé
- [ ] Le VAD AnalyserNode est actif dès l'entrée en session
- [ ] Les états VAD sont affichés: 🟢 À l'écoute / 🔴 Enregistrement / 🟡 Traitement / ⚫ Muet
- [ ] Mute toggle disponible (optionnel, ne casse pas le VAD)
- [ ] Transcript défilant avec messages AI et utilisateur alternés
- [ ] Timer de session visible
- [ ] Bouton "Fin de session" en haut (pas en bas)
- [ ] Auto-scroll du transcript au dernier message

## Source
Vision §10
