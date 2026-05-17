import { apiError, apiOk } from "@/lib/api"
import { logAdminAction } from "@/lib/audit-log"
import { getSession } from "@/lib/auth"
import { canAdminResolveDispute, computePayout } from "@/lib/order-state"
import { prisma } from "@/lib/prisma"
import { resolveDisputeSchema } from "@/lib/validators/payment"

/**
 * 管理员裁决纠纷:
 *  - outcome=release:放款给电工(同 confirm)
 *  - outcome=refund: 退款给顾客(订单 CANCELLED + paymentStatus REFUNDED)
 * 两种结果都写 AuditLog。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "需要管理员权限", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      electricianId: true,
      status: true,
      paymentStatus: true,
      finalPrice: true,
      platformCommissionRate: true,
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (!canAdminResolveDispute(order)) {
    return apiError("CONFLICT", "订单不在申诉中,无法裁决", 409)
  }

  const body = await req.json().catch(() => null)
  const parsed = resolveDisputeSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  if (parsed.data.outcome === "release") {
    if (!order.electricianId || !order.finalPrice) {
      return apiError("BAD_STATE", "订单数据不完整", 500)
    }
    const finalPrice = Number(order.finalPrice)
    const rate = Number(order.platformCommissionRate)
    const { commission, electricianPayout } = computePayout(finalPrice, rate)
    await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          status: "COMPLETED",
          paymentStatus: "RELEASED",
          platformCommissionAmount: commission,
          electricianPayout,
        },
      }),
      prisma.electricianProfile.update({
        where: { userId: order.electricianId },
        data: {
          availableBalance: { increment: electricianPayout },
          totalEarned: { increment: electricianPayout },
          completedOrders: { increment: 1 },
        },
      }),
    ])
    await logAdminAction({
      adminId: session.user.id,
      action: "RESOLVE_DISPUTE_RELEASE",
      targetType: "ORDER",
      targetId: id,
      detail: { note: parsed.data.note ?? null, payout: electricianPayout },
    })
    return apiOk({ outcome: "release", payout: electricianPayout })
  }

  // outcome === "refund"
  await prisma.order.update({
    where: { id },
    data: {
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
      cancelledAt: new Date(),
    },
  })
  await logAdminAction({
    adminId: session.user.id,
    action: "RESOLVE_DISPUTE_REFUND",
    targetType: "ORDER",
    targetId: id,
    detail: { note: parsed.data.note ?? null },
  })
  return apiOk({ outcome: "refund" })
}
