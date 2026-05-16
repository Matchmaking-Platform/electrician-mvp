import { VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { prisma } from "@/lib/prisma"

/**
 * 公开详情:返回单个电工的完整资料。
 * - 仅 APPROVED + 未封禁
 * - 包含 portfolio 案例、报价项、最近 5 条评价
 * - 不返回 ID/人脸图(顾客侧不展示)
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const profile = await prisma.electricianProfile.findFirst({
    where: {
      id,
      verificationStatus: VerificationStatus.APPROVED,
      user: { isBanned: false },
    },
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      serviceAreas: true,
      baseHourlyRate: true,
      isOnline: true,
      lastActiveAt: true,
      avgRating: true,
      ratingCount: true,
      totalOrders: true,
      completedOrders: true,
      user: {
        select: { id: true, name: true, avatarUrl: true, createdAt: true },
      },
      portfolioCases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
          createdAt: true,
        },
      },
      priceItems: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serviceType: true,
          name: true,
          price: true,
          unit: true,
          description: true,
        },
      },
    },
  })

  if (!profile) return apiError("NOT_FOUND", "电工不存在或未通过审核", 404)

  return apiOk({
    id: profile.id,
    userId: profile.user.id,
    name: profile.user.name,
    avatarUrl: profile.user.avatarUrl,
    joinedAt: profile.user.createdAt,
    bio: profile.bio,
    yearsExperience: profile.yearsExperience,
    serviceAreas: (profile.serviceAreas as string[]) ?? [],
    baseHourlyRate: Number(profile.baseHourlyRate),
    isOnline: profile.isOnline,
    lastActiveAt: profile.lastActiveAt,
    avgRating: profile.avgRating,
    ratingCount: profile.ratingCount,
    totalOrders: profile.totalOrders,
    completedOrders: profile.completedOrders,
    portfolioCases: profile.portfolioCases.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      images: (c.images as string[]) ?? [],
      createdAt: c.createdAt,
    })),
    priceItems: profile.priceItems.map((p) => ({
      id: p.id,
      serviceType: p.serviceType,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      description: p.description,
    })),
  })
}
