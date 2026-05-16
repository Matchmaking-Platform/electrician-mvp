import { OrderStatus } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
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
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.IN_PROGRESS,
  OrderStatus.AWAITING_CONFIRMATION,
]
const DONE_STATUSES: OrderStatus[] = [OrderStatus.COMPLETED]
const ENDED_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.DISPUTED,
]

async function load(userId: string, statuses: OrderStatus[]) {
  return prisma.order.findMany({
    where: {
      customerId: userId,
      status: { in: statuses },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      electrician: { select: { id: true, name: true } },
    },
  })
}

type Row = Awaited<ReturnType<typeof load>>[number]

function OrderRows({ items }: { items: Row[] }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        没有数据
      </p>
    )
  }
  return (
    <ul className="grid gap-2">
      {items.map((o) => (
        <li key={o.id}>
          <Link
            href={`/customer/orders/${o.id}`}
            className="hover:bg-muted/40 block rounded-md border p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="grid gap-1">
                <p className="font-medium">{o.title}</p>
                <p className="text-muted-foreground text-xs">
                  {o.serviceType} · {timeAgo(o.createdAt)} ·{" "}
                  {o.electrician?.name ? `电工 ${o.electrician.name}` : "暂无电工"}
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

export default async function CustomerOrdersPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  const [active, done, ended] = await Promise.all([
    load(session.user.id, ACTIVE_STATUSES),
    load(session.user.id, DONE_STATUSES),
    load(session.user.id, ENDED_STATUSES),
  ])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的订单</h1>
        <Link href="/customer/orders/new" className={buttonVariants()}>
          发布新订单
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">全部订单</CardTitle>
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
