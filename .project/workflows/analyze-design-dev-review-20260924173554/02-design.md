---
tags: [run/analyze-design-dev-review-20260924173554, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924173554/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924173554/03-implement]]"
---
### Verdict: PASS
### Page dédiée, pas un onglet
`/fr/comparateur-cv-offre` · `/en/cv-job-match`.
- Promesse et mot-clé SEO différents de l'ATS (« mon CV correspond-il à cette offre »).
- Tunnel mesuré à part.
- La page ATS garde une seule tâche.
### Flux
1. **Formulaire** :
   - dépôt du CV (`CvDropZone` réutilisé) ;
   - zone « Collez l'offre » obligatoire, avec compteur de caractères ;
   - bouton « Comparer » désactivé tant qu'il manque le fichier ou 200 caractères d'offre.
2. **Résultat** (`aria-live="polite"`, focus sur son titre) :
   - jauge de couverture (`ScoreGauge` réutilisé) avec une phrase de verdict : faible sous 30 %, correct, bon à partir de 60 % (mêmes seuils que le moteur) ;
   - deux listes de puces, « Déjà dans votre CV » (coche) et « Absents de votre CV » (icône et texte, pas seulement la couleur) ;
   - note : « mots de 4 lettres et plus, comparés sans accents ».
3. **CTA** « Générer un CV adapté à cette offre » :
   - ouvre le formulaire email + consentement ;
   - puis affiche « Vérifiez votre boîte mail : votre candidature vous attend » ;
   - « Recommencer » remet le formulaire à zéro.
### Accessibilité
Libellés visibles, erreurs reliées par `aria-describedby`, cibles d'au moins 44 px, puces en `border` + `text-foreground` (leçon d'US-135), `prefers-reduced-motion` via `Reveal`.
### Risque UX
Une offre longue donne un taux bas par nature. D'où le tri par fréquence et le verdict en mots plutôt que le seul pourcentage.
