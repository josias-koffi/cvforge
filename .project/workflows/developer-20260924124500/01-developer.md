---
tags: [run/developer-20260924124500, stage/01, agent/developer, result/passed]
prev: "[[workflows/runs/developer-20260924124500/task]]"
next: "[[workflows/runs/developer-20260924124500/final-summary]]"
agent: "[[agents/developer/agent]]"
---
# 01 — developer · US-123 (substitutions)

**Contrat lu en direct** : `GET /substitution/{METIER|APPELLATION|COMPETENCE}/{code}` renvoie `{code, codeSubstitution, typeEntite}`, ou 404 quand aucun successeur n'existe. L'API n'a pas de liste : un appel par code.

**Livré** :
- `RomeReferentialClient.findSubstitution` : renvoie `null` quand il n'y a aucun successeur et `undefined` quand l'appel échoue (le code sera redemandé à la synchro suivante).
- `RomeStore.heldCodes` : liste les codes stockés chez les utilisateurs, table par table.
- `rome:sync` remplace le référentiel, puis demande un successeur pour chaque code encore stocké chez un utilisateur mais absent du nouveau référentiel (200 au plus par synchro). Il enregistre ceux qu'il trouve et les applique avec le moteur existant (réécriture, dédoublonnage, journal). Le résultat va dans `stats.lookups`.
- `rome-substitutions` ajoutée aux valeurs par défaut de compose et de Terraform, ainsi qu'à la doc.

**Vérifié** : 52 tests ROME (dont 5 nouveaux), types et lint au vert. En réel : une compétence 500015 posée sur le compte de test, `rome:sync` → 1 appel, successeur 507259, 1 ligne réécrite. Ligne de test supprimée ensuite.
