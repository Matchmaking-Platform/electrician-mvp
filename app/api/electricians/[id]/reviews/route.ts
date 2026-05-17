import { apiError, apiOk } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { reviewListSchema } from "@/lib/validators/review"

export const dynamic = "force-dynamic"

/**
 * 公开评价列表(顾客端电工详情页用)。
 * 仅返回未下架评价(isHidden=false)。
 *
 * [id] 是 ElectricianProfile.id —— 与 detail API 一致。
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await ctx.params
  const url = new URL(req.url)
  const parsed = reviewListSchema.safeParse(
    Object.fromEntries(url.searchParams)
  )
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const q = parsed.data

  // 把 profileId 换成 userId(Review.electricianId 存的是 User.id)
  const profile = await prisma.electricianProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  })
  if (!profile) return apiError("NOT_FOUND", "电工不存在", 404)

  const where = {
    electricianId: profile.userId,
    isHidden: false,
    ...(q.minStars ? { rating: { gte: q.minStars } } : {}),
  }
  const [total, items] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        customer: { select: { id: true, name: true } },
      },
    }),
  ])

  return apiOk({
    items: items.map((r) => ({
      id: r.id,
      customerName: r.customer.name,
      rating: r.rating,
      professionalismRating: r.professionalismRating,
      punctualityRating: r.punctualityRating,
      valueRating: r.valueRating,
      comment: r.comment,
      images: (r.images as string[]) ?? [],
      electricianReply: r.electricianReply,
      repliedAt: r.repliedAt,
      createdAt: r.createdAt,
    })),
    total,
    page: q.page,
    limit: q.limit,
  })
}
