import { format } from "date-fns"
import { Star } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
} from "@/lib/order-helpers"
import type { OrderStatus, PaymentStatus } from "@prisma/client"

export type OrderInfoData = {
  id: string
  serviceType: string
  title: string
  description: string
  address: string
  latitude: number
  longitude: number
  images: string[]
  scheduledAt: Date | null
  estimatedPrice: number | null
  finalPrice: number | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: Date
  acceptedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  cancelledAt: Date | null
  customer: { id: string; name: string; email?: string | null } | null
  electrician: {
    id: string
    name: string
    email?: string | null
    avgRating?: number | null
    ratingCount?: number | null
    baseHourlyRate?: number | null
  } | null
  /** 是否展示对方的联系邮箱(已 ACCEPTED 后显示对方邮箱) */
  showCounterpartContact?: boolean
}

function fmt(d: Date | string | null) {
  if (!d) return null
  const date = typeof d === "string" ? new Date(d) : d
  return format(date, "yyyy-MM-dd HH:mm")
}

function Timeline({ order }: { order: OrderInfoData }) {
  const events: { label: string; at: Date | null }[] = [
    { label: "发布", at: order.createdAt },
    { label: "接单", at: order.acceptedAt },
    { label: "开工", at: order.startedAt },
    { label: "完工", at: order.completedAt },
    { label: "取消", at: order.cancelledAt },
  ].filter((e) => e.at)
  if (!events.length) return null
  return (
    <ol className="grid gap-1 text-xs">
      {events.map((e) => (
        <li key={e.label} className="text-muted-foreground">
          {fmt(e.at)} · {e.label}
        </li>
      ))}
    </ol>
  )
}

export function OrderInfo({ order }: { order: OrderInfoData }) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{order.title}</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {order.serviceType} · {fmt(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {PAYMENT_STATUS_LABEL[order.paymentStatus]}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="grid gap-1">
            <p className="text-muted-foreground text-xs">问题描述</p>
            <p className="whitespace-pre-wrap">{order.description}</p>
          </div>

          {order.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {order.images.map((u, i) => (
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

          <div className="grid gap-1">
            <p className="text-muted-foreground text-xs">地址</p>
            <p>{order.address}</p>
            <p className="text-muted-foreground text-xs">
              坐标 {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
            </p>
          </div>

          <div className="grid gap-1 sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground text-xs">期望时间</p>
              <p>{order.scheduledAt ? fmt(order.scheduledAt) : "尽快"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">预算 / 估价</p>
              <p>{order.estimatedPrice ? `¥${order.estimatedPrice}` : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">最终价</p>
              <p>{order.finalPrice ? `¥${order.finalPrice}` : "—"}</p>
            </div>
          </div>

          <Timeline order={order} />
        </CardContent>
      </Card>

      {order.electrician ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">已接单师傅</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <div>
              <Link
                href={`/electricians/${order.electrician.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {order.electrician.name}
              </Link>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                <Star className="size-3 fill-amber-400 text-amber-400" />
                {(order.electrician.avgRating ?? 0) > 0
                  ? Number(order.electrician.avgRating).toFixed(1)
                  : "新师傅"}{" "}
                ({order.electrician.ratingCount ?? 0})
              </p>
              {order.showCounterpartContact && order.electrician.email ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  联系邮箱:{order.electrician.email}
                </p>
              ) : null}
            </div>
            <div className="text-right">
              {order.electrician.baseHourlyRate ? (
                <p className="text-sm">
                  ¥{order.electrician.baseHourlyRate} / 小时
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {order.customer && order.showCounterpartContact ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">顾客</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{order.customer.name}</p>
            {order.customer.email ? (
              <p className="text-muted-foreground text-xs">
                {order.customer.email}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
