import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { canCustomerConfirm, computePayout } from "@/lib/order-state"
import { prisma } from "@/lib/prisma"

/**
 * 顾客确认完工 → 释放资金给电工。
 *   - status:AWAITING_CONFIRMATION → COMPLETED
 *   - paymentStatus:HELD → RELEASED
 *   - 电工 ElectricianProfile: availableBalance += payout, totalEarned += payout,
 *                              completedOrders += 1
 *   - 写订单 platformCommissionAmount + electricianPayout
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可确认", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      electricianId: true,
      status: true,
      paymentStatus: true,
      finalPrice: true,
      platformCommissionRate: true,
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (order.customerId !== session.user.id) {
    return apiError("FORBIDDEN", "不是你的订单", 403)
  }
  if (!canCustomerConfirm(order)) {
    return apiError("CONFLICT", "当前订单状态不能确认", 409)
  }
  if (!order.electricianId || !order.finalPrice) {
    return apiError("BAD_STATE", "订单数据不完整,联系客服", 500)
  }

  const finalPrice = Number(order.finalPrice)
  const rate = Number(order.platformCommissionRate)
  const { commission, electricianPayout } = computePayout(finalPrice, rate)

  // 一次 transaction 同时更新订单 + 电工资料,保证两者原子
  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: {
        status: "COMPLETED",
        paymentStatus: "RELEASED",
        platformCommissionAmount: commission,
        electricianPayout,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        platformCommissionAmount: true,
        electricianPayout: true,
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

  return apiOk({
    order: {
      ...updatedOrder,
      platformCommissionAmount: updatedOrder.platformCommissionAmount
        ? Number(updatedOrder.platformCommissionAmount)
        : null,
      electricianPayout: updatedOrder.electricianPayout
        ? Number(updatedOrder.electricianPayout)
        : null,
    },
  })
}
