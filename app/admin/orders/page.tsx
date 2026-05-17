import { OrderStatus } from "@prisma/client"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  timeAgo,
} from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const TABS: Array<{ key: string; statuses: OrderStatus[] }> = [
  { key: "进行中", statuses: [
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.AWAITING_CONFIRMATION,
  ] },
  { key: "已完成", statuses: [OrderStatus.COMPLETED] },
  { key: "已结束", statuses: [OrderStatus.CANCELLED] },
  { key: "申诉中", statuses: [OrderStatus.DISPUTED] },
]

async function load(statuses: OrderStatus[]) {
  return prisma.order.findMany({
    where: { status: { in: statuses } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true } },
      electrician: { select: { name: true } },
    },
  })
}

type Row = Awaited<ReturnType<typeof load>>[number]

function Rows({ items }: { items: Row[] }) {
  if (!items.length)
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        没有数据
      </p>
    )
  return (
    <ul className="grid gap-2">
      {items.map((o) => (
        <li key={o.id}>
          <Link
            href={`/admin/orders/${o.id}`}
            className="hover:bg-muted/40 block rounded-md border p-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid gap-0.5">
                <p className="font-medium">{o.title}</p>
                <p className="text-muted-foreground text-xs">
                  顾客 {o.customer?.name ?? "—"} · 电工{" "}
                  {o.electrician?.name ?? "未指派"} · {timeAgo(o.createdAt)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {o.address}
                  {o.finalPrice
                    ? ` · ¥${Number(o.finalPrice).toFixed(2)}`
                    : ""}
                </p>
              </div>
              <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                {ORDER_STATUS_LABEL[o.status]}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminOrdersPage() {
  const groups = await Promise.all(
    TABS.map(async (t) => ({
      key: t.key,
      items: await load(t.statuses),
    }))
  )

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">订单总览</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">全部订单</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={groups[0].key}>
            <TabsList>
              {groups.map((g) => (
                <TabsTrigger key={g.key} value={g.key}>
                  {g.key} ({g.items.length})
                </TabsTrigger>
              ))}
            </TabsList>
            {groups.map((g) => (
              <TabsContent key={g.key} value={g.key} className="mt-4">
                <Rows items={g.items} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
