const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function limitLength(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function isValidDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function normalizeUrl(rawValue: unknown, maxLength: number) {
  const value = limitLength(typeof rawValue === "string" ? rawValue : "", maxLength);

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeShortText(rawValue: unknown, maxLength = 120) {
  return limitLength(typeof rawValue === "string" ? rawValue : "", maxLength);
}

export function normalizeLongText(rawValue: unknown, maxLength = 1200) {
  return limitLength(typeof rawValue === "string" ? rawValue : "", maxLength);
}

export function normalizeEmail(rawValue: unknown, fallback = "") {
  const candidate = limitLength(
    typeof rawValue === "string" ? rawValue : "",
    320,
  ).toLowerCase();

  if (candidate && EMAIL_PATTERN.test(candidate)) {
    return candidate;
  }

  return fallback;
}

export function normalizePhone(rawValue: unknown) {
  const value = limitLength(typeof rawValue === "string" ? rawValue : "", 32);

  if (!value) {
    return "";
  }

  const sanitized = value.replace(/[^\d+\s().-]/g, "");
  const digitCount = sanitized.replace(/\D/g, "").length;

  if (digitCount < 6 || digitCount > 15) {
    return "";
  }

  return sanitized;
}

export function normalizeDateInput(rawValue: unknown) {
  const value = limitLength(typeof rawValue === "string" ? rawValue : "", 10);

  if (!value || !isValidDate(value)) {
    return "";
  }

  return value;
}

export function normalizePastDateInput(rawValue: unknown) {
  const value = normalizeDateInput(rawValue);

  if (!value) {
    return "";
  }

  const today = new Date().toISOString().slice(0, 10);

  return value > today ? "" : value;
}

export function normalizeFutureDateInput(rawValue: unknown) {
  const value = normalizeDateInput(rawValue);

  if (!value) {
    return "";
  }

  const today = new Date().toISOString().slice(0, 10);

  return value < today ? "" : value;
}

export function normalizeUrlField(rawValue: unknown) {
  return normalizeUrl(rawValue, 240);
}

export function normalizeStringList(rawValue: unknown, itemMaxLength = 80) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeShortText(value, itemMaxLength))
    .filter(Boolean);
}
