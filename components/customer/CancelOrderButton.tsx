"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handle() {
    if (!confirm("确定取消这个订单?")) return
    setBusy(true)
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    })
    setBusy(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? "取消失败")
      return
    }
    toast.success("订单已取消")
    router.refresh()
  }

  return (
    <Button variant="destructive" onClick={handle} disabled={busy}>
      {busy ? "处理中..." : "取消订单"}
    </Button>
  )
}
