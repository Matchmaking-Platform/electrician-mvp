import type { OrderStatus, PaymentStatus } from "@prisma/client"

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "草稿",
  PENDING: "待接单",
  ACCEPTED: "已接单",
  IN_PROGRESS: "进行中",
  AWAITING_CONFIRMATION: "待确认完工",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  DISPUTED: "申诉中",
}

export const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  PENDING: "default",
  ACCEPTED: "secondary",
  IN_PROGRESS: "secondary",
  AWAITING_CONFIRMATION: "secondary",
  COMPLETED: "secondary",
  CANCELLED: "outline",
  DISPUTED: "destructive",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "未支付",
  HELD: "已托管",
  RELEASED: "已结算",
  REFUNDED: "已退款",
}

/** 友好的相对时间 */
export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return "刚刚"
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`
  return date.toLocaleString("zh-CN")
}
