"use server"

import { redirect } from "next/navigation"
import type { CreateCheckoutSessionResponse, CreditPackId } from "@cvforge/types"

import { api, ApiError, type ActionResult } from "@/lib/api"

export async function startCheckout(packId: CreditPackId): Promise<ActionResult> {
  let checkoutUrl: string

  try {
    ;({ checkoutUrl } = await api<CreateCheckoutSessionResponse>(
      "/billing/checkout-sessions",
      { body: { packId }, method: "POST" }
    ))
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  }

  redirect(checkoutUrl)
}
