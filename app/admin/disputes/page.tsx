import { OrderStatus } from "@prisma/client"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { timeAgo } from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export default async function AdminDisputesPage() {
  const items = await prisma.order.findMany({
    where: { status: OrderStatus.DISPUTED },
    orderBy: { updatedAt: "desc" },
    include: {
      customer: { select: { name: true } },
      electrician: { select: { name: true } },
    },
  })

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">申诉处理</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            待处理申诉 ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              暂无申诉
            </p>
          ) : (
            <ul className="grid gap-2">
              {items.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="hover:bg-muted/40 block rounded-md border p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{o.title}</p>
                        <p className="text-muted-foreground text-xs">
                          顾客 {o.customer?.name ?? "—"} · 电工{" "}
                          {o.electrician?.name ?? "—"} · {timeAgo(o.updatedAt)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {o.address}
                        </p>
                      </div>
                      <Badge variant="destructive">申诉中</Badge>
                    </div>
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
