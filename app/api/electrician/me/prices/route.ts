import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { priceItemInputSchema } from "@/lib/validators/electrician"

/** 新增报价项(JSON body) */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) return apiError("NOT_FOUND", "请先完成入驻", 404)

  const body = await req.json().catch(() => null)
  const parsed = priceItemInputSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const created = await prisma.priceItem.create({
    data: {
      electricianId: profile.id,
      ...parsed.data,
    },
    select: {
      id: true,
      serviceType: true,
      name: true,
      price: true,
      unit: true,
      description: true,
    },
  })
  return apiOk(
    {
      item: { ...created, price: Number(created.price) },
    },
    201
  )
}
