import { OrderStatus, VerificationStatus } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"

import { WithdrawDialog } from "@/components/electrician/WithdrawDialog"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { timeAgo } from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const WITHDRAWAL_LABEL: Record<string, string> = {
  PENDING: "处理中",
  APPROVED: "已审批",
  PAID: "已打款",
  REJECTED: "已驳回",
}
const WITHDRAWAL_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  APPROVED: "secondary",
  PAID: "secondary",
  REJECTED: "destructive",
}

export default async function ElectricianWalletPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") {
    redirect("/login")
  }
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      verificationStatus: true,
      availableBalance: true,
      totalEarned: true,
    },
  })
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    redirect("/electrician/onboarding")
  }

  const [recent, withdrawals] = await Promise.all([
    prisma.order.findMany({
      where: {
        electricianId: session.user.id,
        status: OrderStatus.COMPLETED,
        paymentStatus: "RELEASED",
      },
      orderBy: { completedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        finalPrice: true,
        platformCommissionAmount: true,
        electricianPayout: true,
        completedAt: true,
      },
    }),
    prisma.withdrawalRequest.findMany({
      where: { electricianId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        status: true,
        adminNote: true,
        createdAt: true,
        processedAt: true,
      },
    }),
  ])

  const availableBalance = Number(profile.availableBalance)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">钱包</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>可用余额</CardDescription>
            <CardTitle className="text-3xl">
              ¥{availableBalance.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawDialog balance={availableBalance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>累计赚取</CardDescription>
            <CardTitle className="text-3xl">
              ¥{Number(profile.totalEarned).toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">提现记录</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              还没有提现记录
            </p>
          ) : (
            <ul className="divide-y">
              {withdrawals.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">¥{Number(w.amount).toFixed(2)}</p>
                    <p className="text-muted-foreground text-xs">
                      {timeAgo(w.createdAt)}
                      {w.adminNote ? ` · ${w.adminNote}` : ""}
                    </p>
                  </div>
                  <Badge variant={WITHDRAWAL_VARIANT[w.status]}>
                    {WITHDRAWAL_LABEL[w.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近结算</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              还没有完成的订单
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/electrician/orders/${o.id}`}
                    className="hover:bg-muted/40 flex flex-wrap items-center justify-between gap-2 px-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{o.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {o.completedAt ? timeAgo(o.completedAt) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-700">
                        +¥
                        {o.electricianPayout
                          ? Number(o.electricianPayout).toFixed(2)
                          : "0.00"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        总价 ¥
                        {o.finalPrice ? Number(o.finalPrice).toFixed(2) : "—"} ·
                        抽成 ¥
                        {o.platformCommissionAmount
                          ? Number(o.platformCommissionAmount).toFixed(2)
                          : "0.00"}
                      </p>
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
