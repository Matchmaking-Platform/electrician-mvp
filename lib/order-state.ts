import type { Order, OrderStatus, PaymentStatus } from "@prisma/client"

/**
 * 订单状态机助手 —— 把"什么状态下谁能干什么"集中在这里,
 * 避免散落到各 API 里出现一致性错误。
 *
 * MVP 流程(简化,跳过 IN_PROGRESS):
 *   PENDING → 顾客取消 → CANCELLED
 *   PENDING → 电工抢 → ACCEPTED (UNPAID)
 *   ACCEPTED + UNPAID → 顾客支付 → ACCEPTED + HELD
 *   ACCEPTED + HELD → 电工上传完工凭证 → AWAITING_CONFIRMATION + HELD
 *   AWAITING_CONFIRMATION + HELD → 顾客确认 → COMPLETED + RELEASED
 *   AWAITING_CONFIRMATION + HELD → 顾客申诉 → DISPUTED + HELD
 *   DISPUTED → 管理员裁决放款 → COMPLETED + RELEASED
 *                 ↘ 管理员裁决退款 → CANCELLED + REFUNDED(简化:用 CANCELLED 表示终止)
 */

type O = Pick<Order, "status" | "paymentStatus">

export function canCustomerCancel(o: O): boolean {
  return o.status === "PENDING"
}

export function canPay(o: O): boolean {
  return o.status === "ACCEPTED" && o.paymentStatus === "UNPAID"
}

export function canElectricianComplete(o: O): boolean {
  return o.status === "ACCEPTED" && o.paymentStatus === "HELD"
}

export function canCustomerConfirm(o: O): boolean {
  return o.status === "AWAITING_CONFIRMATION" && o.paymentStatus === "HELD"
}

export function canCustomerDispute(o: O): boolean {
  return o.status === "AWAITING_CONFIRMATION" && o.paymentStatus === "HELD"
}

export function canAdminResolveDispute(o: O): boolean {
  return o.status === "DISPUTED"
}

/** 算抽成 + 电工到账。所有金额单位:元 */
export function computePayout(
  finalPrice: number,
  commissionRate: number
): { commission: number; electricianPayout: number } {
  const commission = Math.round(finalPrice * commissionRate * 100) / 100
  const electricianPayout = Math.round((finalPrice - commission) * 100) / 100
  return { commission, electricianPayout }
}

export const ORDER_STATUS_VALUES: OrderStatus[] = [
  "DRAFT",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "AWAITING_CONFIRMATION",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
]

export const PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  "UNPAID",
  "HELD",
  "RELEASED",
  "REFUNDED",
]
