/**
 * 站内通知 + 邮件 助手。
 *
 * 设计目标:
 *  - 每个业务事件一个具名函数,调用方一行落库
 *  - 失败不阻塞主流程(吞错 + 控制台告警)
 *  - 通知种类用字符串常量(spec: Notification.type 是 String 不是 enum)
 *  - 同步触发对应的邮件 mock(后期接真实 provider)
 */

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/mailer"

export const NotificationType = {
  ORDER_ACCEPTED: "ORDER_ACCEPTED",
  NEW_MESSAGE: "NEW_MESSAGE",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  COMPLETION_AWAITING: "COMPLETION_AWAITING",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
  ELECTRICIAN_VERIFIED: "ELECTRICIAN_VERIFIED",
  ELECTRICIAN_REJECTED: "ELECTRICIAN_REJECTED",
  WITHDRAWAL_PAID: "WITHDRAWAL_PAID",
  WITHDRAWAL_REJECTED: "WITHDRAWAL_REJECTED",
} as const

type NotifyInput = {
  userId: string
  type: string
  title: string
  body: string
  link?: string | null
}

/** 站内 + 邮件 双发,失败吞错不抛 */
async function notify(input: NotifyInput) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, isBanned: true },
    })
    if (!user) return
    if (user.isBanned) return

    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    })

    // 邮件副本(mock)
    await sendEmail({
      to: user.email,
      subject: input.title,
      text: input.body + (input.link ? `\n查看详情:${input.link}` : ""),
    })
  } catch (err) {
    console.error("[notify] failed:", err)
  }
}

// ------------- 业务事件包装 -------------

export const notifyOrderAccepted = (input: {
  customerId: string
  orderId: string
  orderTitle: string
  electricianName: string
}) =>
  notify({
    userId: input.customerId,
    type: NotificationType.ORDER_ACCEPTED,
    title: "师傅已接单",
    body: `${input.electricianName} 已接你的订单「${input.orderTitle}」。`,
    link: `/customer/orders/${input.orderId}`,
  })

export const notifyPaymentReceived = (input: {
  electricianId: string
  orderId: string
  orderTitle: string
  amount: number
}) =>
  notify({
    userId: input.electricianId,
    type: NotificationType.PAYMENT_RECEIVED,
    title: "顾客已付款",
    body: `订单「${input.orderTitle}」已托管 ¥${input.amount.toFixed(2)},可以开工了。`,
    link: `/electrician/orders/${input.orderId}`,
  })

export const notifyCompletionAwaiting = (input: {
  customerId: string
  orderId: string
  orderTitle: string
}) =>
  notify({
    userId: input.customerId,
    type: NotificationType.COMPLETION_AWAITING,
    title: "师傅声明已完工",
    body: `订单「${input.orderTitle}」已上传完工凭证,请确认。`,
    link: `/customer/orders/${input.orderId}`,
  })

export const notifyOrderCompleted = (input: {
  electricianId: string
  orderId: string
  orderTitle: string
  payout: number
}) =>
  notify({
    userId: input.electricianId,
    type: NotificationType.ORDER_COMPLETED,
    title: "顾客已确认,款项到账",
    body: `订单「${input.orderTitle}」已结算 ¥${input.payout.toFixed(2)} 到余额。`,
    link: `/electrician/wallet`,
  })

export const notifyReviewReceived = (input: {
  electricianId: string
  orderId: string
  rating: number
}) =>
  notify({
    userId: input.electricianId,
    type: NotificationType.REVIEW_RECEIVED,
    title: "收到新评价",
    body: `顾客给你打了 ${input.rating} 星。`,
    link: `/electrician/reviews`,
  })

export const notifyElectricianVerified = (input: { userId: string }) =>
  notify({
    userId: input.userId,
    type: NotificationType.ELECTRICIAN_VERIFIED,
    title: "资质已通过审核",
    body: "你现在可以在大厅看到匹配你服务区的订单了。",
    link: `/electrician`,
  })

export const notifyElectricianRejected = (input: {
  userId: string
  reason: string
}) =>
  notify({
    userId: input.userId,
    type: NotificationType.ELECTRICIAN_REJECTED,
    title: "资质被驳回",
    body: `理由:${input.reason}。请根据要求修改后重新提交。`,
    link: `/electrician/onboarding`,
  })

export const notifyWithdrawalPaid = (input: {
  electricianId: string
  amount: number
}) =>
  notify({
    userId: input.electricianId,
    type: NotificationType.WITHDRAWAL_PAID,
    title: "提现已打款",
    body: `¥${input.amount.toFixed(2)} 已由管理员打款。`,
    link: `/electrician/wallet`,
  })

export const notifyWithdrawalRejected = (input: {
  electricianId: string
  amount: number
  reason: string
}) =>
  notify({
    userId: input.electricianId,
    type: NotificationType.WITHDRAWAL_REJECTED,
    title: "提现被驳回",
    body: `¥${input.amount.toFixed(2)} 已退回可用余额。理由:${input.reason}`,
    link: `/electrician/wallet`,
  })
