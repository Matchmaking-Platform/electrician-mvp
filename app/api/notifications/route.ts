import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * 当前用户的通知列表(最近 N 条)+ 未读数。
 * 顶部铃铛轮询用。
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)

  const url = new URL(req.url)
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? "20") || 20, 1),
    100
  )

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ])

  return apiOk({ items, unreadCount })
}
