import Link from "next/link"
import { OrderStatus, VerificationStatus } from "@prisma/client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function AdminHome() {
  const session = await getSession()
  const pendingCount = await prisma.electricianProfile.count({
    where: { verificationStatus: VerificationStatus.PENDING },
  })
  const totalElectricians = await prisma.electricianProfile.count()
  const disputeCount = await prisma.order.count({
    where: { status: OrderStatus.DISPUTED },
  })

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">管理员后台</h1>
        <p className="text-muted-foreground text-sm">
          欢迎,{session?.user.name}。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/electricians">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardHeader>
              <CardTitle>电工资质审核</CardTitle>
              <CardDescription>
                {pendingCount} 待审核 / 共 {totalElectricians} 名
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                查看待审核名单 →
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/disputes">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardHeader>
              <CardTitle>申诉处理</CardTitle>
              <CardDescription>{disputeCount} 单待裁决</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                查看争议订单 →
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  )
}
