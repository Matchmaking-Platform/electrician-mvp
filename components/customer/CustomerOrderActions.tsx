"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { ReviewDialog } from "@/components/customer/ReviewDialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  canCustomerCancel,
  canCustomerConfirm,
  canCustomerDispute,
  canPay,
} from "@/lib/order-state"
import type { OrderStatus, PaymentStatus } from "@prisma/client"

export function CustomerOrderActions({
  orderId,
  status,
  paymentStatus,
  estimatedPrice,
  hasReview,
}: {
  orderId: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  estimatedPrice: number | null
  hasReview: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const order = { status, paymentStatus }
  const showCancel = canCustomerCancel(order)
  const showPay = canPay(order)
  const showConfirm = canCustomerConfirm(order)
  const showDispute = canCustomerDispute(order)
  const showReview = status === "COMPLETED" && !hasReview

  async function call(url: string, init?: RequestInit, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(url, init)
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error?.message ?? "操作失败")
        return false
      }
      toast.success(success ?? "已完成")
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!confirm("确定取消?")) return
    await call(`/api/orders/${orderId}/cancel`, { method: "POST" }, "已取消")
  }
  async function handleConfirm() {
    if (!confirm("确认师傅已完工?款项将立即划给师傅。")) return
    const ok = await call(
      `/api/orders/${orderId}/confirm`,
      { method: "POST" },
      "已确认完工,给师傅一个评价吧"
    )
    if (ok) setReviewOpen(true) // 自动弹评价框
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showCancel ? (
          <Button variant="destructive" onClick={handleCancel} disabled={busy}>
            取消订单
          </Button>
        ) : null}
        {showPay ? (
          <Button onClick={() => setPayOpen(true)} disabled={busy}>
            立即支付
          </Button>
        ) : null}
        {showConfirm ? (
          <Button onClick={handleConfirm} disabled={busy}>
            确认完工
          </Button>
        ) : null}
        {showReview ? (
          <Button onClick={() => setReviewOpen(true)} disabled={busy}>
            补评价
          </Button>
        ) : null}
        {showDispute ? (
          <Button
            variant="outline"
            onClick={() => setDisputeOpen(true)}
            disabled={busy}
          >
            申请退款 / 申诉
          </Button>
        ) : null}
      </div>

      <PayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        orderId={orderId}
        defaultAmount={estimatedPrice}
        onDone={() => router.refresh()}
      />
      <DisputeDialog
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        orderId={orderId}
        onDone={() => router.refresh()}
      />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        orderId={orderId}
      />
    </>
  )
}

function PayDialog({
  open,
  onOpenChange,
  orderId,
  defaultAmount,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderId: string
  defaultAmount: number | null
  onDone: () => void
}) {
  const [amount, setAmount] = useState(
    defaultAmount ? String(defaultAmount) : ""
  )
  const [busy, setBusy] = useState(false)

  async function submit() {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("请输入金额")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: n }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "支付失败")
      return
    }
    const mode = data?.mode === "mock" ? "(测试支付)" : ""
    toast.success(`支付成功 ${mode}`)
    onOpenChange(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>支付订单</DialogTitle>
          <DialogDescription>
            MVP 阶段为测试支付,直接置为已托管(未接真实 Stripe)。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="pay-amount">支付金额(元)</Label>
          <Input
            id="pay-amount"
            type="number"
            min={1}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "处理中..." : "确认支付"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisputeDialog({
  open,
  onOpenChange,
  orderId,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderId: string
  onDone: () => void
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (reason.trim().length < 5) {
      toast.error("理由至少 5 个字")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/orders/${orderId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "提交失败")
      return
    }
    toast.success("已提交申诉,等待管理员处理")
    onOpenChange(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>申诉 / 申请退款</DialogTitle>
          <DialogDescription>
            说明你为何对完工不满意。管理员介入后才能放款或退款。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="dispute-reason">理由</Label>
          <Textarea
            id="dispute-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="详细描述问题"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            取消
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? "提交中..." : "提交申诉"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
