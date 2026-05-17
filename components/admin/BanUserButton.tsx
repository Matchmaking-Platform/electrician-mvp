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

export function BanUserButton({
  userId,
  isBanned,
}: {
  userId: string
  isBanned: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function call(ban: boolean) {
    setBusy(true)
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ban, reason: reason.trim() || undefined }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "操作失败")
      return
    }
    toast.success(ban ? "已封禁" : "已解封")
    setOpen(false)
    setReason("")
    router.refresh()
  }

  if (isBanned) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => call(false)}
        disabled={busy}
      >
        解封
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
        封禁
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>封禁用户</DialogTitle>
            <DialogDescription>
              封禁后,该用户无法登录。可随时解封。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="ban-reason">理由(可选)</Label>
            <Textarea
              id="ban-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="违反平台规则、欺诈、骚扰等"
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
              onClick={() => call(true)}
              disabled={busy}
            >
              {busy ? "处理中..." : "确认封禁"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
