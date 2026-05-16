import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { priceItemInputSchema } from "@/lib/validators/electrician"

async function loadOwnedItem(userId: string, id: string) {
  return prisma.priceItem.findFirst({
    where: { id, electrician: { userId } },
    select: { id: true },
  })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }

  const exists = await loadOwnedItem(session.user.id, id)
  if (!exists) return apiError("NOT_FOUND", "报价项不存在或无权操作", 404)

  const body = await req.json().catch(() => null)
  const parsed = priceItemInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const updated = await prisma.priceItem.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      serviceType: true,
      name: true,
      price: true,
      unit: true,
      description: true,
    },
  })
  return apiOk({
    item: { ...updated, price: Number(updated.price) },
  })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }
  const exists = await loadOwnedItem(session.user.id, id)
  if (!exists) return apiError("NOT_FOUND", "报价项不存在或无权操作", 404)
  await prisma.priceItem.delete({ where: { id } })
  return apiOk({ deleted: true })
}
