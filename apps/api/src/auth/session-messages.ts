/**
 * Shared by `AuthService` and `SessionStateMiddleware`. Kept in its own file
 * because the middleware injects `AuthService` while the service needs these
 * strings: importing them from each other forms a cycle, and in the compiled
 * CommonJS build the class ends up `undefined` at decorator-evaluation time,
 * so the container refuses to boot. Vitest's ESM graph hides it.
 */
export const SUSPENDED_ACCOUNT_MESSAGE =
  "Votre compte est suspendu. Contactez le support pour le reactiver.";

export const REVOKED_SESSION_MESSAGE =
  "Votre session a ete revoquee. Reconnectez-vous pour continuer.";
