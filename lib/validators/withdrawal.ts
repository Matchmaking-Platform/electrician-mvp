import { z } from "zod"

export const withdrawalCreateSchema = z.object({
  amount: z.coerce.number().positive("提现金额必须大于 0").max(999999.99),
  bankInfo: z.object({
    bankName: z.string().min(1, "银行名必填").max(50),
    accountName: z.string().min(1, "户名必填").max(50),
    accountNumber: z
      .string()
      .min(8, "账号至少 8 位")
      .max(30)
      .regex(/^[0-9 -]+$/, "账号格式不合法"),
    note: z.string().max(200).optional(),
  }),
})
export type WithdrawalCreate = z.infer<typeof withdrawalCreateSchema>

export const withdrawalDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("paid"),
    adminNote: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    adminNote: z.string().min(1, "驳回需要填理由").max(500),
  }),
])
export type WithdrawalDecision = z.infer<typeof withdrawalDecisionSchema>
