import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { reviewReplySchema } from "@/lib/validators/review"

/** 电工回复评价(只能一次,不可改) */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工可回复", 403)
  }

  const review = await prisma.review.findUnique({
    where: { id },
    select: { id: true, electricianId: true, electricianReply: true },
  })
  if (!review) return apiError("NOT_FOUND", "评价不存在", 404)
  if (review.electricianId !== session.user.id) {
    return apiError("FORBIDDEN", "不是给你的评价", 403)
  }
  if (review.electricianReply) {
    return apiError("CONFLICT", "已经回复过了", 409)
  }

  const body = await req.json().catch(() => null)
  const parsed = reviewReplySchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      electricianReply: parsed.data.reply,
      repliedAt: new Date(),
    },
    select: { id: true, electricianReply: true, repliedAt: true },
  })
  return apiOk({ review: updated })
}
