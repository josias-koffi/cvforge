# Review

Acceptance criteria verdict:

- ✅ Un utilisateur peut gerer plusieurs profils de base
  Evidence: `/profile` now loads a profile registry, supports add/remove/switch, and edits the active profile
- ✅ Le profil actif peut etre selectionne par candidature
  Evidence: `/candidatures` now exposes a selector per application and both generation buttons resolve that stored selection
- ✅ La compatibilite avec CV/LM existants est maintenue
  Evidence: legacy single-profile storage migrates automatically, generation routes stayed unchanged, and app tests/build/lint all pass

Blocking defects: none.

Advisories: profile selection remains browser-local, so it does not roam across devices yet. That is acceptable for this story because the prior profile implementation was already browser-local.
