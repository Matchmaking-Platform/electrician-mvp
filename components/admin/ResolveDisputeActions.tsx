"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ResolveDisputeActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState<null | "release" | "refund">(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!open) return
    setBusy(true)
    const res = await fetch(`/api/admin/orders/${orderId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: open, note: note.trim() || undefined }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "操作失败")
      return
    }
    toast.success(open === "release" ? "已放款给电工" : "已退款给顾客")
    setOpen(null)
    setNote("")
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpen("release")} disabled={busy}>
          放款给电工
        </Button>
        <Button
          variant="destructive"
          onClick={() => setOpen("refund")}
          disabled={busy}
        >
          退款给顾客
        </Button>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "release" ? "确认放款" : "确认退款"}
            </DialogTitle>
            <DialogDescription>
              {open === "release"
                ? "款项会立即划给电工。"
                : "退款后订单结束,电工无收益。"}
              此操作不可撤销,会写入审计日志。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="resolve-note">备注(可选,留给电工/顾客查看)</Label>
            <Textarea
              id="resolve-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)} disabled={busy}>
              取消
            </Button>
            <Button
              variant={open === "release" ? "default" : "destructive"}
              onClick={submit}
              disabled={busy}
            >
              {busy ? "处理中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
