import Link from "next/link"

import { DashboardCharts } from "@/components/admin/DashboardCharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { loadKpiSnapshot, loadLastNDays } from "@/lib/admin-stats"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

const ENTRIES: Array<{
  href: string
  title: string
  desc: (kpi: Awaited<ReturnType<typeof loadKpiSnapshot>>) => string
}> = [
  {
    href: "/admin/electricians",
    title: "电工资质审核",
    desc: (k) => `${k.pendingVerifications} 待审核 / 共 ${k.totalElectricians} 名`,
  },
  {
    href: "/admin/disputes",
    title: "申诉处理",
    desc: (k) => `${k.pendingDisputes} 单待裁决`,
  },
  {
    href: "/admin/reviews",
    title: "评价审核",
    desc: () => "查看 / 下架 用户评价",
  },
  {
    href: "/admin/withdrawals",
    title: "提现审批",
    desc: (k) => `${k.pendingWithdrawals} 单待打款`,
  },
  {
    href: "/admin/users",
    title: "用户管理",
    desc: (k) => `共 ${k.totalUsers} 人`,
  },
  {
    href: "/admin/orders",
    title: "订单总览",
    desc: (k) =>
      `${k.activeOrders} 进行中 · ${k.completedOrders} 已完成`,
  },
  {
    href: "/admin/audit-log",
    title: "操作日志",
    desc: () => "审计所有管理员动作",
  },
]

export default async function AdminHome() {
  const session = await getSession()
  const [kpi, daily] = await Promise.all([
    loadKpiSnapshot(),
    loadLastNDays(7),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">管理员后台</h1>
          <p className="text-muted-foreground text-sm">
            欢迎,{session?.user.name}。
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="累计 GMV" value={`¥${kpi.gmv.toFixed(2)}`} />
        <Kpi
          label="平台抽成"
          value={`¥${kpi.commission.toFixed(2)}`}
        />
        <Kpi label="累计完成订单" value={String(kpi.completedOrders)} />
        <Kpi label="进行中订单" value={String(kpi.activeOrders)} />
      </div>

      <div className="mb-6">
        <DashboardCharts data={daily} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENTRIES.map((e) => (
          <Link key={e.href} href={e.href}>
            <Card className="hover:bg-muted/40 transition-colors">
              <CardHeader>
                <CardTitle>{e.title}</CardTitle>
                <CardDescription>{e.desc(kpi)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">进入 →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
