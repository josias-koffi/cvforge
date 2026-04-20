# Stage 1 — Analyze

## Scope Verdict

Passe. `US-015` peut etre livre sans integration IA reelle en etablissant un contrat de donnees prompt-safe aligne sur la vision `§15.3`.

## Product Framing

- Le depot ne contient pas encore de client OpenRouter ou de pipeline CV/LM/interview.
- Le besoin immediat est donc de verrouiller la forme des donnees autorisees avant ces integrations.
- La story reste dans le perimetre MVP car elle prepare explicitement l'integration OpenRouter mentionnee par la vision.

## Acceptance Mapping

1. Donnees interdites non transmises:
   un helper doit supprimer ou transformer `lastName`, `phone`, `email`, `birthDate` et toute adresse exacte.
2. Champs a reinjecter identifies:
   le resultat doit nommer les champs locaux a reinjecter apres generation.
3. Comportement couvert par des tests:
   des tests doivent verifier les omissions, la pseudonymisation `[CANDIDATE]`, la reduction a la ville et le plan de reinjection.

## Missing Questions

- Aucun bloqueur produit.
- Les liens publics (`LinkedIn`, `GitHub`, portfolio) ne sont pas explicitement regles par la vision; ils resteront hors du contrat prompt-safe par minimisation, sans les marquer comme champs de reinjection.
