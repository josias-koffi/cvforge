# Task: US-051 — Ajouter le rôle recruteur et les organisations / comptes entreprise

## Sprint
015

## Workflow
`none` (single product-owner agent)

## Agent
product-owner

## Description
Modéliser le rôle `recruiter` et les `Organization` / comptes entreprise pour V2.0.
Définir les permissions séparées des rôles `user` et `admin` existants.

## Acceptance criteria
- [ ] Le rôle recruteur est modélisé
- [ ] Les organisations et comptes entreprise sont gérés
- [ ] Les permissions sont séparées des rôles `user` et `admin`

## Source
Vision §16 (V2.0), §3.3

## Context
Current auth model: `AuthRole = "admin" | "user"` (auth.types.ts)
Store: file-based JSON, no organization concept yet.
