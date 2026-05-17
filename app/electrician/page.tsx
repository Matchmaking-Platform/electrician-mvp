import { VerificationStatus } from "@prisma/client"
import Link from "next/link"
import { redirect } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
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
          <CardTitle>个人主页</CardTitle>
          <CardDescription>
            完善简介、案例、报价能显著提升被选率。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            当前参考时薪:¥{Number(profile.baseHourlyRate).toFixed(2)}/小时
          </p>
          <Link href="/electrician/profile" className={buttonVariants()}>
            管理资料
          </Link>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/electrician/orders/hall">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardHeader>
              <CardTitle>接单大厅</CardTitle>
              <CardDescription>实时刷新匹配你服务区的新订单</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/electrician/orders">
          <Card className="hover:bg-muted/40 transition-colors">
            <CardHeader>
              <CardTitle>我的订单</CardTitle>
              <CardDescription>查看已接订单的进度</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Link href="/electrician/wallet" className="mt-4 block">
        <Card className="hover:bg-muted/40 transition-colors">
          <CardHeader>
            <CardTitle>钱包</CardTitle>
            <CardDescription>查看余额、累计收入、最近结算</CardDescription>
          </CardHeader>
        </Card>
      </Link>
    </main>
  )
}
