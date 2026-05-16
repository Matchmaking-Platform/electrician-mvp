import { OrderStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * 顾客取消订单。仅在 PENDING(还没人抢)时可自助取消。
 * 已 ACCEPTED 及之后,需要走纠纷流程(阶段 6+)。
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可取消订单", 403)
  }

  const result = await prisma.order.updateMany({
    where: {
      id,
      customerId: session.user.id,
      status: OrderStatus.PENDING,
    },
    data: {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
    },
  })

  if (result.count === 0) {
    const exists = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, customerId: true },
    })
    if (!exists) return apiError("NOT_FOUND", "订单不存在", 404)
    if (exists.customerId !== session.user.id) {
      return apiError("FORBIDDEN", "不是你的订单", 403)
    }
    return apiError(
      "CONFLICT",
      "订单状态已变化,只有待接单状态可自助取消",
      409
    )
  }

  return apiOk({ ok: true })
}
