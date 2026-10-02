---
tags: [run/developer-20261002134029, stage/01, agent/developer]
sprint: "[[sprints/sprint-034#US-166]]"
agent: "[[agents/developer/agent]]"
prev: "[[workflows/runs/developer-20261002134029/task]]"
next: "[[workflows/runs/developer-20261002134029/final-summary]]"
---
# 01 — Developer
**Verdict : PASS** (6 critères sur 6, plus le dernier critère d'US-163).

- E-mail `composeJobAlertEmail` (mail/job-alert-email.ts), sur `renderEmail` : intitulé, entreprise, lieu, « publiée il y a X min », source citée (licence), raisons, bouton « Postuler avec **Jobspark** » (règle de marque, au lieu de « CVForge » dans le sprint), `List-Unsubscribe`. Une offre par e-mail, ou plusieurs regroupées (20 au plus).
- Préférences `jobAlerts` {enabled, threshold, rhythm} (types + migration 0054). Le matcher les lit : coupées → pas d'alerte ; « toutes » → seuil 35. `mergePreferences` corrige au passage un bug existant : changer un interrupteur e-mail effaçait les autres.
- `JobAlertDispatcher` : minuterie et bail à part, isolation par candidat. Immédiat sous 10 offres/jour, sinon une fois par heure ; heures calmes 21 h – 7 h (Paris). Pas de crédit en jeu. SMTP non configuré → rien n'est marqué, le récap reprend.
- `listPending` exclut les alertes envoyées et les offres fermées : une offre retirée ne part jamais (US-163, critère 8).
- Web : carte « Alertes » sur /notifications.
- Tests : API 2 137, web 379 ; tsc et eslint propres.
