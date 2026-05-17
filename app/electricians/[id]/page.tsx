import { VerificationStatus } from "@prisma/client"
import { Star } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PublicReviewsTab } from "@/components/customer/PublicReviewsTab"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()

  const profile = await prisma.electricianProfile.findFirst({
    where: {
      id,
      verificationStatus: VerificationStatus.APPROVED,
      user: { isBanned: false },
    },
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      serviceAreas: true,
      baseHourlyRate: true,
      isOnline: true,
      avgRating: true,
      ratingCount: true,
      totalOrders: true,
      completedOrders: true,
      user: { select: { name: true, avatarUrl: true } },
      portfolioCases: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, images: true },
      },
      priceItems: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serviceType: true,
          name: true,
          price: true,
          unit: true,
          description: true,
        },
      },
    },
  })
  if (!profile) notFound()

  // 下单链接:已登录顾客直接到下单页(阶段 4 实现);未登录/电工/管理员都先去 /login
  const orderHref =
    session?.user?.role === "CUSTOMER"
      ? `/customer/orders/new?electricianId=${profile.id}`
      : `/login?callbackUrl=/electricians/${profile.id}`

  const areas = (profile.serviceAreas as string[]) ?? []

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/electricians"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回列表
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-wrap items-start gap-4">
            <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full text-xl">
              {profile.user.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{profile.user.name}</CardTitle>
                {profile.isOnline ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    在线
                  </Badge>
                ) : (
                  <Badge variant="outline">离线</Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  {profile.avgRating > 0
                    ? profile.avgRating.toFixed(1)
                    : "新师傅"}{" "}
                  ({profile.ratingCount} 评价)
                </span>
                <span>·</span>
                <span>从业 {profile.yearsExperience} 年</span>
                <span>·</span>
                <span>完成 {profile.completedOrders} 单</span>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                服务区:{areas.join("、") || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">
                ¥{Number(profile.baseHourlyRate).toFixed(0)}
              </p>
              <p className="text-muted-foreground text-xs">参考时薪 / 小时</p>
            </div>
          </div>
          {profile.bio ? (
            <p className="mt-4 text-sm whitespace-pre-wrap">{profile.bio}</p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <Link href={orderHref} className={buttonVariants({ size: "lg" })}>
              {session?.user?.role === "CUSTOMER" ? "立即下单" : "登录后下单"}
            </Link>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases">
            案例 ({profile.portfolioCases.length})
          </TabsTrigger>
          <TabsTrigger value="prices">
            报价 ({profile.priceItems.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            评价 ({profile.ratingCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cases" className="mt-4">
          {profile.portfolioCases.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              师傅还没上传案例
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.portfolioCases.map((c) => {
                const images = (c.images as string[]) ?? []
                return (
                  <Card key={c.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{c.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      {images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1">
                          {images.slice(0, 3).map((u, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={u}
                              alt=""
                              className="aspect-square w-full rounded-md object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                      {c.description ? (
                        <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                          {c.description}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="prices" className="mt-4">
          {profile.priceItems.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              师傅还没列报价
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类别</TableHead>
                  <TableHead>项目</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.priceItems.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.serviceType}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.description ? (
                        <div className="text-muted-foreground text-xs">
                          {p.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{Number(p.price).toFixed(2)} / {p.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <PublicReviewsTab electricianProfileId={profile.id} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
