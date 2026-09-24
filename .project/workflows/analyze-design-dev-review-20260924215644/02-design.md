---
tags: [run/analyze-design-dev-review-20260924215644, agent/designer, stage/design]
agent: "[[agents/designer/agent]]"
prev: "[[workflows/runs/analyze-design-dev-review-20260924215644/01-analyze]]"
next: "[[workflows/runs/analyze-design-dev-review-20260924215644/03-implement]]"
---
### Verdict: PASS
### Page
- **Fil d'Ariane** : Outils → Ce métier recrute-t-il ? → métier en département.
- **H1** : « Comptable en Loire-Atlantique (44) : le métier recrute-t-il ? ».
- **Chapeau** : une phrase écrite à partir des chiffres (tension en mots, offres sur 12 mois, demandeurs). Elle rend la page lisible et unique, sans texte inventé.
- **Bloc chiffres** : `TensionGauge` et `MarketFigures` réutilisés d'US-137, sources et date de lecture en dessous.
- **CTA** « Recevoir chaque matin les offres de ce métier » : le même composant qu'US-137, extrait de `JobMarketResult` pour ne pas le dupliquer.
- **Maillage interne** :
  - « Appellations couvertes » (texte seul) ;
  - « Le même métier ailleurs dans la région » (liens) ;
  - « D'autres métiers en Loire-Atlantique » (liens) ;
  - lien vers l'outil pour chercher un autre métier.
### Accessibilité
- Un seul H1 ; sections avec H2.
- Fil d'Ariane en `nav aria-label` + `ol`, page courante en `aria-current="page"`.
- Les liens de maillage sont nommés par leur texte, sans « cliquez ici ».
### Risque
La phrase du chapeau doit se lire aussi quand un chiffre manque (demandeurs absents dans les départements voisins). On a donc deux variantes : avec et sans demandeurs.
