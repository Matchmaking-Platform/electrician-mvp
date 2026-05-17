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

export function WithdrawalActions({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState<null | "paid" | "reject">(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!open) return
    if (open === "reject" && note.trim().length < 1) {
      toast.error("驳回必须填理由")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/admin/withdrawals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: open,
        adminNote: note.trim() || undefined,
      }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "操作失败")
      return
    }
    toast.success(open === "paid" ? "已标记打款" : "已驳回")
    setOpen(null)
    setNote("")
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setOpen("paid")}>标记已打款</Button>
        <Button variant="destructive" onClick={() => setOpen("reject")}>
          驳回
        </Button>
      </div>
      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "paid" ? "确认打款" : "驳回提现"}
            </DialogTitle>
            <DialogDescription>
              {open === "paid"
                ? "请确认你已通过银行/支付宝完成打款。"
                : "驳回后,金额会立即退回电工可用余额。"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="adm-note">
              {open === "reject" ? "理由(必填)" : "备注(可选)"}
            </Label>
            <Textarea
              id="adm-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(null)}
              disabled={busy}
            >
              取消
            </Button>
            <Button
              variant={open === "reject" ? "destructive" : "default"}
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
