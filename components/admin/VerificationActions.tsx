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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function VerificationActions({
  profileId,
  status,
}: {
  profileId: string
  status: "PENDING" | "APPROVED" | "REJECTED"
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")

  async function call(payload: object) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/electricians/${profileId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error?.message ?? "操作失败")
        return false
      }
      toast.success("操作成功")
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    await call({ action: "approve" })
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("请填写驳回理由")
      return
    }
    const ok = await call({ action: "reject", reason: reason.trim() })
    if (ok) {
      setOpen(false)
      setReason("")
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleApprove} disabled={busy || status === "APPROVED"}>
        {status === "APPROVED" ? "已通过" : "通过审核"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="destructive" disabled={busy}>
              驳回
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>驳回资质</DialogTitle>
            <DialogDescription>
              请填写明确的理由,会通知到电工。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">理由</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例:身份证照片不清晰,请补传清晰版本"
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
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={busy}
            >
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
