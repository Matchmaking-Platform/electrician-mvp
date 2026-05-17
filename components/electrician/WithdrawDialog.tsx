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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function WithdrawDialog({ balance }: { balance: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("请输入金额")
      return
    }
    if (n > balance) {
      toast.error("超过可用余额")
      return
    }
    setBusy(true)
    const res = await fetch("/api/electrician/me/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: n,
        bankInfo: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          note: note.trim() || undefined,
        },
      }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "提现失败")
      return
    }
    toast.success("提现申请已提交,等待管理员处理")
    setOpen(false)
    setAmount("")
    setBankName("")
    setAccountName("")
    setAccountNumber("")
    setNote("")
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={balance <= 0}>
        申请提现
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请提现</DialogTitle>
            <DialogDescription>
              当前可用余额 ¥{balance.toFixed(2)}。提交后金额会立即冻结,
              管理员核对后打款。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="w-amt">金额(元)</Label>
              <Input
                id="w-amt"
                type="number"
                min={1}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="w-bank">开户行</Label>
              <Input
                id="w-bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="例:招商银行上海分行"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="w-acc-name">户名</Label>
              <Input
                id="w-acc-name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="持卡人姓名"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="w-acc-no">卡号</Label>
              <Input
                id="w-acc-no"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="支持空格/短横线分隔"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="w-note">备注(可选)</Label>
              <Textarea
                id="w-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              取消
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "提交中..." : "提交申请"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
