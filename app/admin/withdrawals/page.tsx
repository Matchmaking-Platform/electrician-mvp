import Link from "next/link"

import { WithdrawalActions } from "@/components/admin/WithdrawalActions"
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
import { timeAgo } from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待处理",
  APPROVED: "已审批",
  PAID: "已打款",
  REJECTED: "已驳回",
}
const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  APPROVED: "secondary",
  PAID: "secondary",
  REJECTED: "destructive",
}

async function load(status: "PENDING" | "PAID" | "REJECTED") {
  return prisma.withdrawalRequest.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { electrician: { select: { name: true, email: true } } },
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
    <ul className="grid gap-3">
      {items.map((w) => {
        const bank = (w.bankInfo as {
          bankName?: string
          accountName?: string
          accountNumber?: string
          note?: string
        } | null) ?? null
        return (
          <li
            key={w.id}
            className="rounded-md border p-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {w.electrician.name}{" "}
                  <span className="text-muted-foreground text-xs">
                    ({w.electrician.email})
                  </span>
                </p>
                <p className="text-muted-foreground text-xs">
                  {timeAgo(w.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  ¥{Number(w.amount).toFixed(2)}
                </p>
                <Badge variant={STATUS_VARIANT[w.status]}>
                  {STATUS_LABEL[w.status]}
                </Badge>
              </div>
            </div>
            {bank ? (
              <div className="text-muted-foreground mt-2 grid gap-0.5 text-xs">
                <span>开户行:{bank.bankName}</span>
                <span>户名:{bank.accountName}</span>
                <span>卡号:{bank.accountNumber}</span>
                {bank.note ? <span>备注:{bank.note}</span> : null}
              </div>
            ) : null}
            {w.adminNote ? (
              <p className="mt-2 text-xs">管理备注:{w.adminNote}</p>
            ) : null}
            {w.status === "PENDING" ? (
              <div className="mt-3">
                <WithdrawalActions id={w.id} />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export default async function AdminWithdrawalsPage() {
  const [pending, paid, rejected] = await Promise.all([
    load("PENDING"),
    load("PAID"),
    load("REJECTED"),
  ])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">提现审批</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">提现申请</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                待处理 ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="paid">
                已打款 ({paid.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                已驳回 ({rejected.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4">
              <Rows items={pending} />
            </TabsContent>
            <TabsContent value="paid" className="mt-4">
              <Rows items={paid} />
            </TabsContent>
            <TabsContent value="rejected" className="mt-4">
              <Rows items={rejected} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
