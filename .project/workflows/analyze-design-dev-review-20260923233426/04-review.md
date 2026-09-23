---
tags: [run/analyze-design-dev-review-20260923233426, agent/qa-reviewer, stage/review]
agent: "[[agents/qa-reviewer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260923233426/03-implement]]"
next: "[[workflows/runs/analyze-design-dev-review-20260923233426/final-summary]]"
---
### Verdict: PASS
### Critères
1. ROMEO seulement à l'enregistrement ; 5 appellations avec score. ✅ Tests du service et du contrôleur, vérifié en réel.
2. Puces confirmer ou retirer, et autocomplétion locale en repli. ✅ Vérifié en réel ; rendu, libellés d'accessibilité et mention de la source testés.
3. `search_project_rome` (0029), sans clé étrangère, hors `profiles`. ✅
4. ROMEO indisponible : l'enregistrement réussit. ✅ `predict` renvoie `null` et `suggest` ne lève jamais d'erreur (testé) ; le projet est enregistré avant l'appel.
5. Purge RGPD. ✅ Test PGlite : les lignes du compte purgé partent, celles des autres restent.
### Sécurité
- Chaque décision vérifie que le profil appartient à l'utilisateur. Un code saisi à la main doit exister dans le référentiel. Autocomplétion réservée aux sessions, requête bornée à 80 caractères.
### Advisories
- L'export RGPD n'inclut pas encore les appellations : à ajouter.
- Enregistrer attend ROMEO, environ 200 ms en réel.
- Avertissement d'hydratation dû à une extension du navigateur (`cz-shortcut-listen`), sans lien avec ce code.
