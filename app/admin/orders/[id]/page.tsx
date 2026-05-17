import Link from "next/link"
import { notFound } from "next/navigation"

import { ResolveDisputeActions } from "@/components/admin/ResolveDisputeActions"
import { OrderInfo, type OrderInfoData } from "@/components/shared/OrderInfo"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      electrician: {
        select: {
          id: true,
          name: true,
          email: true,
          electricianProfile: {
            select: {
              avgRating: true,
              ratingCount: true,
              baseHourlyRate: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        include: { sender: { select: { name: true } } },
      },
    },
  })
  if (!order) notFound()

  const data: OrderInfoData = {
    id: order.id,
    serviceType: order.serviceType,
    title: order.title,
    description: order.description,
    address: order.address,
    latitude: order.latitude,
    longitude: order.longitude,
    images: (order.images as string[]) ?? [],
    scheduledAt: order.scheduledAt,
    estimatedPrice:
      order.estimatedPrice != null ? Number(order.estimatedPrice) : null,
    finalPrice: order.finalPrice != null ? Number(order.finalPrice) : null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    acceptedAt: order.acceptedAt,
    startedAt: order.startedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    customer: order.customer,
    electrician: order.electrician
      ? {
          id: order.electrician.id,
          name: order.electrician.name,
          email: order.electrician.email,
          avgRating: order.electrician.electricianProfile?.avgRating ?? null,
          ratingCount:
            order.electrician.electricianProfile?.ratingCount ?? null,
          baseHourlyRate: order.electrician.electricianProfile?.baseHourlyRate
            ? Number(order.electrician.electricianProfile.baseHourlyRate)
            : null,
        }
      : null,
    showCounterpartContact: true,
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/admin/disputes"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回申诉列表
      </Link>
      <OrderInfo
        order={data}
        completionPhotos={(order.completionPhotos as string[]) ?? []}
      />

      {order.status === "DISPUTED" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">裁决</CardTitle>
          </CardHeader>
          <CardContent>
            <ResolveDisputeActions orderId={order.id} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            聊天记录(最近 {order.messages.length} 条)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {order.messages.length === 0 ? (
            <p className="text-muted-foreground text-center">无消息</p>
          ) : (
            order.messages.map((m) => (
              <div key={m.id} className="border-b pb-2 last:border-b-0">
                <p className="text-muted-foreground text-xs">
                  {m.sender.name} · {new Date(m.createdAt).toLocaleString("zh-CN")}
                </p>
                {m.messageType === "IMAGE" && m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="mt-1 max-h-40 rounded-md"
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}
