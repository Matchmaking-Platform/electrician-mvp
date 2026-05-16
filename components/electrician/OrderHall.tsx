"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { timeAgo } from "@/lib/order-helpers"
import type { OrderListItem } from "@/app/api/orders/route"

const POLL_MS = 5_000

export function OrderHall() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery<{
    items: OrderListItem[]
    total: number
  }>({
    queryKey: ["hall"],
    queryFn: async () => {
      const res = await fetch("/api/orders?scope=hall")
      if (!res.ok) throw new Error("加载失败")
      return res.json()
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  })

  const grab = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/orders/${id}/grab`, { method: "POST" })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "抢单失败")
      }
      return data as { ok: true; orderId: string }
    },
    onSuccess: ({ orderId }) => {
      toast.success("抢单成功")
      qc.invalidateQueries({ queryKey: ["hall"] })
      router.push(`/electrician/orders/${orderId}`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      qc.invalidateQueries({ queryKey: ["hall"] })
    },
  })

  if (isError) {
    return (
      <p className="text-destructive py-8 text-center text-sm">
        加载失败,请稍后重试。
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {isLoading
            ? "加载中..."
            : `${data?.total ?? 0} 个匹配订单 · 每 ${POLL_MS / 1000} 秒自动刷新`}
        </span>
      </div>

      {data && data.items.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          暂时没有匹配你服务区的新订单。挂着这个页面,新订单会自动出现。
        </p>
      ) : (
        <div className="grid gap-3">
          {data?.items.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{o.title}</CardTitle>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {o.serviceType} · {timeAgo(o.createdAt)} ·{" "}
                      {o.customerName ?? "顾客"}
                    </p>
                  </div>
                  <Badge variant="default">待接单</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="text-muted-foreground line-clamp-2">
                  {o.description}
                </p>
                <div className="grid gap-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">地址:</span>
                    {o.address}
                  </p>
                  {o.scheduledAt ? (
                    <p>
                      <span className="text-muted-foreground">期望时间:</span>
                      {new Date(o.scheduledAt).toLocaleString("zh-CN")}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">期望:尽快</p>
                  )}
                  {o.estimatedPrice ? (
                    <p>
                      <span className="text-muted-foreground">顾客预算:</span>
                      ¥{o.estimatedPrice}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => grab.mutate(o.id)}
                    disabled={grab.isPending}
                  >
                    {grab.isPending && grab.variables === o.id
                      ? "抢单中..."
                      : "抢单"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
