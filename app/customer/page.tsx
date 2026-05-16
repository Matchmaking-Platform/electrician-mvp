import { OrderStatus } from "@prisma/client"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  timeAgo,
} from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export default async function CustomerHome() {
  const session = await getSession()
  if (!session?.user) return null

  const [active, recent, totalCount] = await Promise.all([
    prisma.order.count({
      where: {
        customerId: session.user.id,
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
    prisma.order.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where: { customerId: session.user.id } }),
  ])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">顾客工作台</h1>
          <p className="text-muted-foreground text-sm">
            欢迎,{session.user.name}。
          </p>
        </div>
        <Link
          href="/customer/orders/new"
          className={buttonVariants({ size: "lg" })}
        >
          发布新订单
        </Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>进行中</CardDescription>
            <CardTitle>{active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>累计订单</CardDescription>
            <CardTitle>{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Link href="/electricians">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardHeader>
              <CardDescription>浏览电工</CardDescription>
              <CardTitle>找师傅 →</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近订单</CardTitle>
          <Link
            href="/customer/orders"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            查看全部 →
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              还没有订单。
            </p>
          ) : (
            <ul className="grid gap-2">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/customer/orders/${o.id}`}
                    className="hover:bg-muted/40 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{o.title}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={ORDER_STATUS_VARIANT[o.status]}>
                        {ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {timeAgo(o.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
