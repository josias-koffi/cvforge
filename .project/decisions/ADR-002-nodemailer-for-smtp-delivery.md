# ADR-002: Use Nodemailer for SMTP-based auth email delivery
Date: 2026-04-19
Status: accepted

## Context
The MVP vision requires passwordless login by email magic link. The repository already has a provider-neutral SMTP configuration module, but it does not yet have a delivery mechanism that can send auth emails through that configuration. Implementing a production-safe SMTP client from scratch on top of Node sockets would add avoidable protocol complexity for TLS negotiation, authentication, and message formatting.

## Decision
Add `nodemailer` to `@cvforge/api` and use it as the SMTP transport layer for auth email delivery. The application will keep the provider-neutral SMTP configuration and use `EMAIL_FROM` as the sender identity.

## Consequences
- Magic-link delivery can reuse the existing SMTP environment variables without binding the code to Resend-specific APIs.
- The auth flow becomes production-usable for real email delivery while remaining swappable through environment changes only.
- The repository accepts one focused runtime dependency in exchange for a mature SMTP implementation.

## Alternatives considered
- Keep the current generated-link preview and defer real delivery indefinitely.
- Implement SMTP directly with Node `net` and `tls`.
- Integrate a provider-specific API instead of SMTP.
