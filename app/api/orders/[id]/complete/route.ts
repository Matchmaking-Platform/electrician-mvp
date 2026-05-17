import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { notifyCompletionAwaiting } from "@/lib/notifications"
import { canElectricianComplete } from "@/lib/order-state"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"

/**
 * 电工上传完工凭证(multipart:photos[]),状态推进到 AWAITING_CONFIRMATION。
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工可标记完工", 403)
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      electricianId: true,
      status: true,
      paymentStatus: true,
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)
  if (order.electricianId !== session.user.id) {
    return apiError("FORBIDDEN", "不是你接的订单", 403)
  }
  if (!canElectricianComplete(order)) {
    return apiError("CONFLICT", "当前订单状态不能标记完工", 409)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }
  const files = form
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0)
  if (files.length === 0) {
    return apiError("INVALID_INPUT", "请至少上传 1 张完工凭证", 400)
  }
  if (files.length > 8) {
    return apiError("INVALID_INPUT", "最多 8 张照片", 400)
  }
  const urls: string[] = []
  for (const f of files) {
    const res = await saveImage({
      file: f,
      subdir: `electrician/${session.user.id}/completion/${id}`,
    })
    if (!res.ok) return apiError("INVALID_INPUT", res.error, 400)
    urls.push(res.url)
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "AWAITING_CONFIRMATION",
      completionPhotos: urls,
      completedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      customerId: true,
      status: true,
      completionPhotos: true,
    },
  })

  await notifyCompletionAwaiting({
    customerId: updated.customerId,
    orderId: id,
    orderTitle: updated.title,
  })

  return apiOk({
    order: {
      id: updated.id,
      status: updated.status,
      completionPhotos: updated.completionPhotos as string[],
    },
  })
}
