import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { canCustomerDispute } from "@/lib/order-state"
import { prisma } from "@/lib/prisma"
import { disputeInputSchema } from "@/lib/validators/payment"

/** 顾客申诉,订单进入 DISPUTED 等管理员裁决 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可发起申诉", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      status: true,
      paymentStatus: true,
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (order.customerId !== session.user.id) {
    return apiError("FORBIDDEN", "不是你的订单", 403)
  }
  if (!canCustomerDispute(order)) {
    return apiError("CONFLICT", "当前订单状态不能申诉", 409)
  }

  const body = await req.json().catch(() => null)
  const parsed = disputeInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  // 通过往订单的聊天里留一条"申诉系统消息"来记录理由
  // (避免再给 Order 加 disputeReason 字段)
  await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { status: "DISPUTED" },
    }),
    prisma.chatMessage.create({
      data: {
        orderId: id,
        senderId: session.user.id,
        content: `[顾客发起申诉] ${parsed.data.reason}`,
        messageType: "TEXT",
      },
    }),
  ])

  return apiOk({ ok: true })
}
