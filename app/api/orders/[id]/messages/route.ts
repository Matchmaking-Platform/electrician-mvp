import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ChatMessageDTO } from "@/lib/socket-events"

/**
 * 拉取订单聊天历史。最近 N 条按时间升序返回(便于直接渲染气泡)。
 * 权限:订单的顾客 / 电工 / ADMIN。
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)

  const order = await prisma.order.findUnique({
    where: { id },
    select: { customerId: true, electricianId: true },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)

  const isOwner =
    session.user.id === order.customerId ||
    session.user.id === order.electricianId
  if (!isOwner && session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "无权查看", 403)
  }

  const url = new URL(req.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? "50") || 50, 1),
    200
  )

  const recent = await prisma.chatMessage.findMany({
    where: { orderId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sender: { select: { name: true } },
    },
  })

  // 翻转成时间升序
  const items: ChatMessageDTO[] = recent.reverse().map((m) => ({
    id: m.id,
    orderId: m.orderId,
    senderId: m.senderId,
    senderName: m.sender.name,
    content: m.content,
    messageType: m.messageType,
    imageUrl: m.imageUrl,
    createdAt: m.createdAt.toISOString(),
  }))

  return apiOk({ items })
}
