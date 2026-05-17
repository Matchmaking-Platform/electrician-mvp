import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"

/** 聊天图片上传 —— 返回 URL,前端再用 socket 发图片消息 */
export async function POST(
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
  if (
    session.user.id !== order.customerId &&
    session.user.id !== order.electricianId
  ) {
    return apiError("FORBIDDEN", "无权访问", 403)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }
  const file = form.get("image")
  if (!(file instanceof File) || file.size === 0) {
    return apiError("INVALID_INPUT", "未上传图片", 400)
  }

  const res = await saveImage({ file, subdir: `chat/${id}` })
  if (!res.ok) return apiError("INVALID_INPUT", res.error, 400)

  return apiOk({ url: res.url })
}
