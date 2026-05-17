import { OrderStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * 计算近 N 天的运营数据,按本地日期分桶。
 *
 * 包含:
 *  - newOrders: 当天创建的订单数
 *  - newCustomers / newElectricians: 当天注册数
 *  - gmv: 当天完成的订单 finalPrice 之和(只算 RELEASED 的)
 */
export type DailyPoint = {
  date: string // YYYY-MM-DD
  newOrders: number
  newCustomers: number
  newElectricians: number
  gmv: number
}

const DAY_MS = 86_400_000

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const dd = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export async function loadLastNDays(days = 7): Promise<DailyPoint[]> {
  const today = startOfLocalDay(new Date())
  const since = new Date(today.getTime() - (days - 1) * DAY_MS)

  // 拉数据,内存里桶
  const [orders, users, completed] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, role: true },
    }),
    prisma.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        paymentStatus: "RELEASED",
        completedAt: { gte: since, not: null },
      },
      select: { completedAt: true, finalPrice: true },
    }),
  ])

  // 预生成 N 个桶,日期顺序
  const buckets: Record<string, DailyPoint> = {}
  const labels: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY_MS)
    const k = fmt(d)
    labels.push(k)
    buckets[k] = {
      date: k,
      newOrders: 0,
      newCustomers: 0,
      newElectricians: 0,
      gmv: 0,
    }
  }

  for (const o of orders) {
    const k = fmt(startOfLocalDay(o.createdAt))
    if (buckets[k]) buckets[k].newOrders++
  }
  for (const u of users) {
    const k = fmt(startOfLocalDay(u.createdAt))
    if (!buckets[k]) continue
    if (u.role === "CUSTOMER") buckets[k].newCustomers++
    else if (u.role === "ELECTRICIAN") buckets[k].newElectricians++
  }
  for (const c of completed) {
    if (!c.completedAt || !c.finalPrice) continue
    const k = fmt(startOfLocalDay(c.completedAt))
    if (buckets[k]) buckets[k].gmv += Number(c.finalPrice)
  }

  return labels.map((k) => buckets[k])
}

export async function loadKpiSnapshot() {
  const [
    totalUsers,
    totalElectricians,
    pendingVerifications,
    activeOrders,
    completedOrders,
    pendingDisputes,
    pendingWithdrawals,
    gmvAgg,
    commissionAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.electricianProfile.count(),
    prisma.electricianProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.order.count({
      where: {
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.IN_PROGRESS,
            OrderStatus.AWAITING_CONFIRMATION,
          ],
        },
      },
    }),
    prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
    prisma.order.count({ where: { status: OrderStatus.DISPUTED } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    prisma.order.aggregate({
      where: {
        status: OrderStatus.COMPLETED,
        paymentStatus: "RELEASED",
      },
      _sum: { finalPrice: true },
    }),
    prisma.order.aggregate({
      where: {
        status: OrderStatus.COMPLETED,
        paymentStatus: "RELEASED",
      },
      _sum: { platformCommissionAmount: true },
    }),
  ])

  return {
    totalUsers,
    totalElectricians,
    pendingVerifications,
    activeOrders,
    completedOrders,
    pendingDisputes,
    pendingWithdrawals,
    gmv: Number(gmvAgg._sum.finalPrice ?? 0),
    commission: Number(commissionAgg._sum.platformCommissionAmount ?? 0),
  }
}
