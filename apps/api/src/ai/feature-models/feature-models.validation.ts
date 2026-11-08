import {
  aiModelProviders,
  findAnthropicModel,
  isOpenRouterModelId,
  isRoutableAiFeature,
  type AiFeature,
  type AiModelChoice,
  type AiModelProvider,
} from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";

export function parseRoutableFeature(value: unknown): AiFeature {
  if (!isRoutableAiFeature(value)) {
    throw new BadRequestException("Fonctionnalite IA inconnue.");
  }

  return value;
}

function isProvider(value: unknown): value is AiModelProvider {
  return (aiModelProviders as readonly unknown[]).includes(value);
}

export function parseModelChoice(body: unknown): AiModelChoice {
  const { model: rawModel, provider } = (body ?? {}) as Record<string, unknown>;
  const model = typeof rawModel === "string" ? rawModel.trim() : "";

  if (!isProvider(provider)) {
    throw new BadRequestException("Fournisseur IA inconnu.");
  }

  const isKnown =
    provider === "anthropic" ? findAnthropicModel(model) !== undefined : isOpenRouterModelId(model);
  if (!isKnown) {
    throw new BadRequestException("Modele IA invalide pour ce fournisseur.");
  }

  return { model, provider };
}

const MAX_BALANCE_USD = 1_000_000;

/** A balance in dollars, or `null` to remove it. */
export function parseBalance(body: unknown): number | null {
  const { balanceUsd } = (body ?? {}) as Record<string, unknown>;
  if (balanceUsd === null) return null;

  if (
    typeof balanceUsd !== "number" ||
    !Number.isFinite(balanceUsd) ||
    balanceUsd < 0 ||
    balanceUsd > MAX_BALANCE_USD
  ) {
    throw new BadRequestException("Solde invalide.");
  }

  return balanceUsd;
}
