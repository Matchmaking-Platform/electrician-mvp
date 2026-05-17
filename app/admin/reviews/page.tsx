import Link from "next/link"

import { HideReviewButton } from "@/components/admin/HideReviewButton"
import { ReviewCard, type ReviewItem } from "@/components/shared/ReviewCard"
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
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function loadReviews(hidden: boolean | "all") {
  return prisma.review.findMany({
    where: hidden === "all" ? {} : { isHidden: hidden },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      customer: { select: { name: true } },
      electrician: { select: { name: true } },
    },
  })
}

type Row = Awaited<ReturnType<typeof loadReviews>>[number]

function toItem(r: Row): ReviewItem {
  return {
    id: r.id,
    customerName: r.customer.name,
    rating: r.rating,
    professionalismRating: r.professionalismRating,
    punctualityRating: r.punctualityRating,
    valueRating: r.valueRating,
    comment: r.comment,
    images: (r.images as string[]) ?? [],
    electricianReply: r.electricianReply,
    repliedAt: r.repliedAt,
    isHidden: r.isHidden,
    hiddenReason: r.hiddenReason,
    createdAt: r.createdAt,
  }
}

function Rows({ items }: { items: Row[] }) {
  if (!items.length)
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        没有数据
      </p>
    )
  return (
    <div className="grid gap-3">
      {items.map((r) => (
        <div key={r.id} className="grid gap-2">
          <p className="text-muted-foreground text-xs">
            对电工 {r.electrician.name}
          </p>
          <ReviewCard item={toItem(r)} showHidden />
          <div className="flex justify-end">
            <HideReviewButton reviewId={r.id} isHidden={r.isHidden} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function AdminReviewsPage() {
  const [visible, hidden] = await Promise.all([
    loadReviews(false),
    loadReviews(true),
  ])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">评价审核</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">评价管理</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="visible">
            <TabsList>
              <TabsTrigger value="visible">
                展示中 ({visible.length})
              </TabsTrigger>
              <TabsTrigger value="hidden">
                已下架 ({hidden.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="visible" className="mt-4">
              <Rows items={visible} />
            </TabsContent>
            <TabsContent value="hidden" className="mt-4">
              <Rows items={hidden} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
