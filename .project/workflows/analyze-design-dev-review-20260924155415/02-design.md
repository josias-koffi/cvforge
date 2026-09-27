---
tags: [run/analyze-design-dev-review-20260924155415, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924155415/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924155415/03-implement]]"
---
### Verdict: PASS
### Page `/analyses-ats/[scanId]` (app, desktop d'abord)
- **`PageHeader`** : « Analyse ATS de votre CV », avec pour description « Analysé le … · consultable jusqu'au … ». La date de fin est affichée : le rapport disparaît après 30 jours, et le candidat ne doit pas le découvrir en cherchant.
- **Carte « Score »** : le chiffre en grand, `tabular-nums`, avec `AtsScoreBadge`, qui écrit déjà la bande en toutes lettres.
- **Carte « Critère par critère »** : une barre par dimension évaluée, libellé et `n / 100` à côté. Une dimension non évaluée est affichée comme telle, jamais comme un 0.
- **Carte « Points relevés »** : un point par ligne, les critiques d'abord. L'icône change avec la gravité, mais le libellé la dit toujours.
- **CTA principal** : « Créer une candidature » vers `/candidatures/new`. C'est la suite logique : un CV adapté à une offre.
- **État absent** (introuvable, expiré ou appartenant à un autre email) : 404 standard. On ne distingue pas ces cas, pour ne rien révéler.

### Tableau de bord
Section « Vos analyses ATS » sous les cartes de synthèse, affichée seulement s'il en existe. Trois lignes au plus (date, badge de score), chacune menant au rapport.

### Accessibilité
- Barres en `aria-hidden`, la valeur étant écrite en texte à côté.
- Liste des points relevés en `<ul>`.
- Pas d'animation superflue.

Libellés en français, copiés de la landing : le web n'est qu'en français.
