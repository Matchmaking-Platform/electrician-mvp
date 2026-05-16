import { OrderStatus } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"

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
import { getSession } from "@/lib/auth"
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  timeAgo,
} from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.AWAITING_CONFIRMATION,
]
const DONE_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED]
const ENDED_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.DISPUTED,
]

async function load(electricianId: string, statuses: OrderStatus[]) {
  return prisma.order.findMany({
    where: { electricianId, status: { in: statuses } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: { select: { id: true, name: true } } },
  })
}

type Row = Awaited<ReturnType<typeof load>>[number]

function OrderRows({ items }: { items: Row[] }) {
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
            href={`/electrician/orders/${o.id}`}
            className="hover:bg-muted/40 block rounded-md border p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{o.title}</p>
                <p className="text-muted-foreground text-xs">
                  顾客 {o.customer?.name ?? "—"} · {o.serviceType} ·{" "}
                  {timeAgo(o.createdAt)}
                </p>
                <p className="text-muted-foreground text-xs">{o.address}</p>
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

export default async function ElectricianOrdersPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [active, done, ended] = await Promise.all([
    load(session.user.id, ACTIVE_STATUSES),
    load(session.user.id, DONE_STATUSES),
    load(session.user.id, ENDED_STATUSES),
  ])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">我的订单</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">已接订单</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">
                进行中 ({active.length})
              </TabsTrigger>
              <TabsTrigger value="done">已完成 ({done.length})</TabsTrigger>
              <TabsTrigger value="ended">已结束 ({ended.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-4">
              <OrderRows items={active} />
            </TabsContent>
            <TabsContent value="done" className="mt-4">
              <OrderRows items={done} />
            </TabsContent>
            <TabsContent value="ended" className="mt-4">
              <OrderRows items={ended} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
