import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { notifyPaymentReceived } from "@/lib/notifications"
import { canPay } from "@/lib/order-state"
import { prisma } from "@/lib/prisma"
import { paymentInputSchema } from "@/lib/validators/payment"

/**
 * 顾客支付。
 *
 * MVP 行为:
 *   - 校验 STRIPE_SECRET_KEY 是否设置;若空则走 MOCK,直接置 paymentStatus=HELD
 *   - 若已配 Stripe key,改用 PaymentIntent(代码留 TODO,本 MVP 默认 mock)
 *
 * body:{ amount: number }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可支付", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, customerId: true, status: true, paymentStatus: true },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (order.customerId !== session.user.id) {
    return apiError("FORBIDDEN", "不是你的订单", 403)
  }
  if (!canPay(order)) {
    return apiError("CONFLICT", "当前订单状态不能支付", 409)
  }

  const body = await req.json().catch(() => null)
  const parsed = paymentInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const amount = parsed.data.amount

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()

  if (stripeKey) {
    // TODO: 接入真实 Stripe(代码骨架):
    //   import Stripe from "stripe"
    //   const stripe = new Stripe(stripeKey)
    //   const pi = await stripe.paymentIntents.create({
    //     amount: Math.round(amount * 100),
    //     currency: "cny",
    //     metadata: { orderId: order.id },
    //   })
    //   await prisma.order.update({ where: { id }, data: { stripePaymentIntentId: pi.id } })
    //   return apiOk({ mode: "stripe", clientSecret: pi.client_secret })
    //
    // 真支付的 paymentStatus=HELD 在 Stripe webhook 里改,不在这里。
    return apiError(
      "NOT_IMPLEMENTED",
      "Stripe 实接代码尚未启用,生产部署时补全",
      501
    )
  }

  // ---------------- MOCK 路径 ----------------
  const updated = await prisma.order.update({
    where: { id },
    data: {
      finalPrice: amount,
      paymentStatus: "HELD",
      stripePaymentIntentId: `mock_${Date.now()}`,
    },
    select: {
      id: true,
      title: true,
      paymentStatus: true,
      finalPrice: true,
      electricianId: true,
    },
  })

  if (updated.electricianId) {
    await notifyPaymentReceived({
      electricianId: updated.electricianId,
      orderId: id,
      orderTitle: updated.title,
      amount,
    })
  }

  return apiOk({
    mode: "mock",
    order: {
      id: updated.id,
      paymentStatus: updated.paymentStatus,
      finalPrice: updated.finalPrice ? Number(updated.finalPrice) : null,
    },
  })
}
