import type { Prisma, PrismaClient } from "@prisma/client"

/**
 * 根据当前未下架评价重算电工的 avgRating + ratingCount,
 * 并写回 ElectricianProfile。
 * 新建/下架/恢复评价后调用,保证数据一致。
 *
 * 接受 PrismaClient 或事务 client(Prisma.TransactionClient)。
 */
export async function recomputeElectricianRating(
  client: PrismaClient | Prisma.TransactionClient,
  electricianUserId: string
) {
  const result = await client.review.aggregate({
    where: { electricianId: electricianUserId, isHidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  })

  const avg = result._avg.rating ?? 0
  const count = result._count.rating

  await client.electricianProfile.update({
    where: { userId: electricianUserId },
    data: {
      avgRating: Math.round(avg * 100) / 100,
      ratingCount: count,
    },
  })
}
