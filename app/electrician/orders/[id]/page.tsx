import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { ChatPanel } from "@/components/shared/ChatPanel"
import { OrderInfo, type OrderInfoData } from "@/components/shared/OrderInfo"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") {
    redirect("/login")
  }

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
    },
  })
  if (!order) notFound()
  if (order.electricianId !== session.user.id) {
    // 已被别人抢 / 不是我接的
    redirect("/electrician/orders/hall")
  }

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
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/electrician/orders"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回我的订单
      </Link>
      <OrderInfo order={data} />

      <div className="mt-6">
        <ChatPanel
          orderId={order.id}
          currentUserId={session.user.id}
          counterpartName={order.customer?.name ?? null}
        />
      </div>

      <p className="text-muted-foreground mt-6 text-xs">
        下一阶段:开工、上传完工凭证、收款将在阶段 6 接通支付后开放。
      </p>
    </main>
  )
}
