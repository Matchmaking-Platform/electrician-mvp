import { VerificationStatus } from "@prisma/client"
import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianDashboard() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") redirect("/login")

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      verificationStatus: true,
      totalOrders: true,
      completedOrders: true,
      avgRating: true,
      ratingCount: true,
      baseHourlyRate: true,
    },
  })

  // 非 APPROVED → 去入驻页(里面会根据当前状态显示表单/审核中/被驳回)
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    redirect("/electrician/onboarding")
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">电工工作台</h1>
        <p className="text-muted-foreground text-sm">
          欢迎,{session.user.name}。
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>累计订单</CardDescription>
            <CardTitle>{profile.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>完成订单</CardDescription>
            <CardTitle>{profile.completedOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>评分</CardDescription>
            <CardTitle>
              {profile.avgRating.toFixed(1)}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                ({profile.ratingCount})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>占位</CardTitle>
          <CardDescription>
            接单大厅、订单管理、收入提现等功能在阶段 4+ 实现。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            当前参考时薪:¥{Number(profile.baseHourlyRate).toFixed(2)}/小时
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
