export const SMTP_CONFIG = Symbol("SMTP_CONFIG");

export type SmtpConfig = {
  enabled: boolean;
  provider: string | null;
  server: string | null;
  port: number | null;
  user: string | null;
  password: string | null;
};

type SmtpEnv = NodeJS.ProcessEnv;

const SMTP_REQUIRED_KEYS = [
  "SMTP_SERVER",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
] as const;

function readEnvValue(env: SmtpEnv, key: keyof SmtpEnv) {
  const value = env[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function parsePort(rawPort: string) {
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a positive integer.");
  }

  return port;
}

export function createSmtpConfig(env: SmtpEnv = process.env): SmtpConfig {
  const provider = readEnvValue(env, "SMTP_PROVIDER");
  const server =
    readEnvValue(env, "SMTP_SERVER") ?? readEnvValue(env, "SMTP_HOST");
  const rawPort = readEnvValue(env, "SMTP_PORT");
  const user = readEnvValue(env, "SMTP_USER");
  const password = readEnvValue(env, "SMTP_PASSWORD");

  const hasAnyConfiguredValue =
    provider !== null ||
    server !== null ||
    rawPort !== null ||
    user !== null ||
    password !== null;

  if (!hasAnyConfiguredValue) {
    return {
      enabled: false,
      provider: null,
      server: null,
      port: null,
      user: null,
      password: null,
    };
  }

  const missingKeys = SMTP_REQUIRED_KEYS.filter((key) => {
    switch (key) {
      case "SMTP_SERVER":
        return server === null;
      case "SMTP_PORT":
        return rawPort === null;
      case "SMTP_USER":
        return user === null;
      case "SMTP_PASSWORD":
        return password === null;
    }
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Incomplete SMTP configuration. Missing: ${missingKeys.join(", ")}.`,
    );
  }

  if (rawPort === null) {
    throw new Error("Incomplete SMTP configuration. Missing: SMTP_PORT.");
  }

  const port = parsePort(rawPort);

  return {
    enabled: true,
    provider,
    server,
    port,
    user,
    password,
  };
}
