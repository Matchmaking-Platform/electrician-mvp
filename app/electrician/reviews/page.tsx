import { VerificationStatus } from "@prisma/client"
import { redirect } from "next/navigation"

import { ReplyForm } from "@/components/electrician/ReplyForm"
import { ReviewCard, type ReviewItem } from "@/components/shared/ReviewCard"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function ElectricianReviewsPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") {
    redirect("/login")
  }
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      verificationStatus: true,
      avgRating: true,
      ratingCount: true,
    },
  })
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    redirect("/electrician/onboarding")
  }

  const reviews = await prisma.review.findMany({
    where: { electricianId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { customer: { select: { name: true } } },
  })

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">我收到的评价</h1>
        <p className="text-muted-foreground text-sm">
          平均 {profile.avgRating.toFixed(1)} 星 · 共 {profile.ratingCount} 条
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>还没有评价</CardTitle>
            <CardDescription>
              完成订单后顾客就能给你打分了
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reviews.map((r) => {
            const item: ReviewItem = {
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
            return (
              <div key={r.id} className="grid gap-2">
                <ReviewCard item={item} showHidden />
                {!r.electricianReply && !r.isHidden ? (
                  <ReplyForm reviewId={r.id} />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
