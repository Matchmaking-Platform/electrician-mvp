"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import {
  MultiImagePicker,
  type MultiItem,
} from "@/components/shared/MultiImagePicker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { canElectricianComplete } from "@/lib/order-state"
import type { OrderStatus, PaymentStatus } from "@prisma/client"

export function ElectricianOrderActions({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: string
  status: OrderStatus
  paymentStatus: PaymentStatus
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [photos, setPhotos] = useState<MultiItem[]>([])
  const [busy, setBusy] = useState(false)

  const showComplete = canElectricianComplete({ status, paymentStatus })

  async function submit() {
    const files = photos.filter((p): p is File => p instanceof File)
    if (files.length === 0) {
      toast.error("请至少上传 1 张完工凭证")
      return
    }
    setBusy(true)
    const fd = new FormData()
    for (const f of files) fd.append("photos", f)
    const res = await fetch(`/api/orders/${orderId}/complete`, {
      method: "POST",
      body: fd,
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "提交失败")
      return
    }
    toast.success("已提交,等待顾客确认")
    setOpen(false)
    setPhotos([])
    router.refresh()
  }

  if (!showComplete && paymentStatus !== "UNPAID") {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {paymentStatus === "UNPAID" ? (
          <span className="text-muted-foreground bg-muted/40 rounded-md px-3 py-2 text-sm">
            等顾客付款后开工
          </span>
        ) : null}
        {showComplete ? (
          <Button onClick={() => setOpen(true)}>上传完工凭证</Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>上传完工凭证</DialogTitle>
            <DialogDescription>
              至少 1 张,最多 8 张。顾客确认后款项会划给你。
            </DialogDescription>
          </DialogHeader>
          <MultiImagePicker
            name="completion-photos"
            label="完工照片"
            value={photos}
            onChange={setPhotos}
            max={8}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "提交中..." : "提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
