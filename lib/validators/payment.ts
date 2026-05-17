import { z } from "zod"

export const paymentInputSchema = z.object({
  /** 最终成交金额(元) */
  amount: z.coerce.number().positive("金额必须大于 0").max(999999.99),
})
export type PaymentInput = z.infer<typeof paymentInputSchema>

export const disputeInputSchema = z.object({
  reason: z.string().min(5, "理由至少 5 个字").max(500),
})
export type DisputeInput = z.infer<typeof disputeInputSchema>

export const resolveDisputeSchema = z.discriminatedUnion("outcome", [
  z.object({ outcome: z.literal("release"), note: z.string().max(500).optional() }),
  z.object({ outcome: z.literal("refund"), note: z.string().max(500).optional() }),
])
export type ResolveDispute = z.infer<typeof resolveDisputeSchema>
