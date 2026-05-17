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

export function HideReviewButton({
  reviewId,
  isHidden,
}: {
  reviewId: string
  isHidden: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function hide() {
    if (reason.trim().length < 1) {
      toast.error("请填写下架理由")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/admin/reviews/${reviewId}/hide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "下架失败")
      return
    }
    toast.success("已下架")
    setOpen(false)
    setReason("")
    router.refresh()
  }

  async function unhide() {
    if (!confirm("确定恢复这条评价?")) return
    setBusy(true)
    const res = await fetch(`/api/admin/reviews/${reviewId}/hide`, {
      method: "DELETE",
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "恢复失败")
      return
    }
    toast.success("已恢复")
    router.refresh()
  }

  if (isHidden) {
    return (
      <Button variant="outline" size="sm" onClick={unhide} disabled={busy}>
        恢复
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        下架
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>下架评价</DialogTitle>
            <DialogDescription>
              下架后评价不再公开展示,电工评分会立即重算。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="hide-reason">理由</Label>
            <Textarea
              id="hide-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例:含有人身攻击 / 广告 / 与事实严重不符"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={hide} disabled={busy}>
              {busy ? "处理中..." : "确认下架"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
