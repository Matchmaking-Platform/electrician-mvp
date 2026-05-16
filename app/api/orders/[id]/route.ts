import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** 单个订单详情。权限:顾客本人 / 接单电工 / 管理员 / 大厅时的潜在电工(只读 PENDING) */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      electrician: {
        select: {
          id: true,
          name: true,
          email: true,
          electricianProfile: {
            select: {
              avgRating: true,
              ratingCount: true,
              baseHourlyRate: true,
            },
          },
        },
      },
    },
  })
  if (!order) return apiError("NOT_FOUND", "订单不存在", 404)

  const role = session.user.role
  const isOwnerCustomer = order.customerId === session.user.id
  const isOwnerElectrician = order.electricianId === session.user.id
  const isPendingElectrician =
    role === "ELECTRICIAN" && order.status === "PENDING"
  const isAdmin = role === "ADMIN"

  if (
    !isOwnerCustomer &&
    !isOwnerElectrician &&
    !isPendingElectrician &&
    !isAdmin
  ) {
    return apiError("FORBIDDEN", "无权查看此订单", 403)
  }

  return apiOk({
    id: order.id,
    customerId: order.customerId,
    electricianId: order.electricianId,
    customer: order.customer,
    electrician: order.electrician
      ? {
          id: order.electrician.id,
          name: order.electrician.name,
          email: order.electrician.email,
          avgRating: order.electrician.electricianProfile?.avgRating ?? 0,
          ratingCount:
            order.electrician.electricianProfile?.ratingCount ?? 0,
          baseHourlyRate:
            order.electrician.electricianProfile?.baseHourlyRate
              ? Number(order.electrician.electricianProfile.baseHourlyRate)
              : 0,
        }
      : null,
    serviceType: order.serviceType,
    title: order.title,
    description: order.description,
    address: order.address,
    latitude: order.latitude,
    longitude: order.longitude,
    images: (order.images as string[]) ?? [],
    scheduledAt: order.scheduledAt,
    estimatedPrice:
      order.estimatedPrice !== null && order.estimatedPrice !== undefined
        ? Number(order.estimatedPrice)
        : null,
    finalPrice:
      order.finalPrice !== null && order.finalPrice !== undefined
        ? Number(order.finalPrice)
        : null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    platformCommissionRate: Number(order.platformCommissionRate),
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
  })
}
