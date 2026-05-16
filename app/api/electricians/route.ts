import { VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { electricianListSchema } from "@/lib/validators/electrician"

/**
 * 公开列表:查 APPROVED + 未封禁的电工,带筛选/排序/分页。
 *
 * 性能注意:MVP 阶段把 area 子串匹配 / 模糊搜索都放到 JS 里做,
 * 拉全表再筛。数据量到 ~1000 行以上时,要把 area 改成 jsonb raw query。
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = electricianListSchema.safeParse(
    Object.fromEntries(url.searchParams)
  )
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const q = parsed.data

  const all = await prisma.electricianProfile.findMany({
    where: {
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
      completedOrders: true,
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  })

  type Row = (typeof all)[number]

  // --- 筛选 ---
  const lowerQ = q.q?.toLowerCase()
  const lowerArea = q.area?.toLowerCase()

  function matchesAll(p: Row): boolean {
    if (lowerQ) {
      const hay = `${p.user.name} ${p.bio ?? ""}`.toLowerCase()
      if (!hay.includes(lowerQ)) return false
    }
    if (lowerArea) {
      const areas = ((p.serviceAreas as string[]) ?? []).map((s) =>
        s.toLowerCase()
      )
      if (!areas.some((a) => a.includes(lowerArea))) return false
    }
    if (q.minRating !== undefined && p.avgRating < q.minRating) return false
    const rate = Number(p.baseHourlyRate)
    if (q.minPrice !== undefined && rate < q.minPrice) return false
    if (q.maxPrice !== undefined && rate > q.maxPrice) return false
    if (q.online === true && !p.isOnline) return false
    return true
  }

  const filtered = all.filter(matchesAll)

  // --- 排序 ---
  function sortKey(a: Row, b: Row): number {
    switch (q.sort) {
      case "rating":
        return (
          b.avgRating - a.avgRating ||
          b.ratingCount - a.ratingCount
        )
      case "priceAsc":
        return Number(a.baseHourlyRate) - Number(b.baseHourlyRate)
      case "priceDesc":
        return Number(b.baseHourlyRate) - Number(a.baseHourlyRate)
      case "comprehensive":
      default: {
        // 在线优先 → 评分 → 评价数 → 完单数
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1
        return (
          b.avgRating - a.avgRating ||
          b.ratingCount - a.ratingCount ||
          b.completedOrders - a.completedOrders
        )
      }
    }
  }
  filtered.sort(sortKey)

  // --- 分页 ---
  const total = filtered.length
  const start = (q.page - 1) * q.limit
  const items = filtered.slice(start, start + q.limit).map((p) => ({
    id: p.id,
    userId: p.user.id,
    name: p.user.name,
    avatarUrl: p.user.avatarUrl,
    bio: p.bio,
    yearsExperience: p.yearsExperience,
    serviceAreas: (p.serviceAreas as string[]) ?? [],
    baseHourlyRate: Number(p.baseHourlyRate),
    isOnline: p.isOnline,
    avgRating: p.avgRating,
    ratingCount: p.ratingCount,
    completedOrders: p.completedOrders,
  }))

  return apiOk({
    items,
    total,
    page: q.page,
    limit: q.limit,
  })
}

/** TypeScript:列表返回的单条形状 */
export type ElectricianListItem = {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  bio: string | null
  yearsExperience: number
  serviceAreas: string[]
  baseHourlyRate: number
  isOnline: boolean
  avgRating: number
  ratingCount: number
  completedOrders: number
}
