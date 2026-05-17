import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { notifyReviewReceived } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { recomputeElectricianRating } from "@/lib/ratings"
import { saveImage } from "@/lib/uploads"
import { reviewCreateFormSchema } from "@/lib/validators/review"

/**
 * 顾客对已完成订单提交评价。
 * - 仅在 status === COMPLETED 时允许
 * - 一个订单只允许一条评价(Review.orderId @unique)
 * - 写入后重算电工 avgRating / ratingCount(同一事务)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可评价", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      customerId: true,
      electricianId: true,
      status: true,
      review: { select: { id: true } },
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (order.customerId !== session.user.id) {
    return apiError("FORBIDDEN", "不是你的订单", 403)
  }
  if (order.status !== "COMPLETED") {
    return apiError("CONFLICT", "订单未完成,无法评价", 409)
  }
  if (!order.electricianId) {
    return apiError("BAD_STATE", "订单没有电工,无法评价", 500)
  }
  if (order.review) {
    return apiError("CONFLICT", "已评价过此订单", 409)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }
  const parsed = reviewCreateFormSchema.safeParse({
    rating: form.get("rating"),
    professionalismRating: form.get("professionalismRating"),
    punctualityRating: form.get("punctualityRating"),
    valueRating: form.get("valueRating"),
    comment: form.get("comment") ?? "",
  })
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  // 图片
  const files = form
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
  if (files.length > 6) {
    return apiError("INVALID_INPUT", "评价最多 6 张图", 400)
  }
  const imageUrls: string[] = []
  for (const f of files) {
    const r = await saveImage({
      file: f,
      subdir: `customer/${session.user.id}/reviews/${id}`,
    })
    if (!r.ok) return apiError("INVALID_INPUT", r.error, 400)
    imageUrls.push(r.url)
  }

  const electricianId = order.electricianId
  const created = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: {
        orderId: id,
        customerId: session.user.id,
        electricianId,
        rating: parsed.data.rating,
        professionalismRating: parsed.data.professionalismRating,
        punctualityRating: parsed.data.punctualityRating,
        valueRating: parsed.data.valueRating,
        comment: parsed.data.comment || null,
        images: imageUrls,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    })
    await recomputeElectricianRating(tx, electricianId)
    return r
  })

  await notifyReviewReceived({
    electricianId,
    orderId: id,
    rating: parsed.data.rating,
  })

  return apiOk({ review: created }, 201)
}
