"use server"

import { redirect } from "next/navigation"
import type { CreateCheckoutSessionResponse } from "@cvforge/types"

import { api, ApiError, type ActionResult } from "@/lib/api"

export async function startCheckout(offerId: string): Promise<ActionResult> {
  let checkoutUrl: string

  try {
    ;({ checkoutUrl } = await api<CreateCheckoutSessionResponse>(
      "/billing/checkout-sessions",
      { body: { offerId }, method: "POST" }
    ))
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message }
    throw error
  }

  redirect(checkoutUrl)
}
