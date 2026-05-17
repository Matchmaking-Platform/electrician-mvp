"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import {
  MultiImagePicker,
  type MultiItem,
} from "@/components/shared/MultiImagePicker"
import { StarRating } from "@/components/shared/StarRating"
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

type Props = {
  orderId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ReviewDialog({ orderId, open, onOpenChange }: Props) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [pro, setPro] = useState(0)
  const [punc, setPunc] = useState(0)
  const [val, setVal] = useState(0)
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<MultiItem[]>([])
  const [busy, setBusy] = useState(false)

  function reset() {
    setRating(0)
    setPro(0)
    setPunc(0)
    setVal(0)
    setComment("")
    setImages([])
  }

  async function submit() {
    if ([rating, pro, punc, val].some((s) => s < 1)) {
      toast.error("请把 4 个维度都打分")
      return
    }
    setBusy(true)
    const fd = new FormData()
    fd.append("rating", String(rating))
    fd.append("professionalismRating", String(pro))
    fd.append("punctualityRating", String(punc))
    fd.append("valueRating", String(val))
    fd.append("comment", comment)
    for (const i of images) if (i instanceof File) fd.append("images", i)

    const res = await fetch(`/api/orders/${orderId}/review`, {
      method: "POST",
      body: fd,
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "提交失败")
      return
    }
    toast.success("评价已提交,感谢反馈!")
    onOpenChange(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>评价师傅</DialogTitle>
          <DialogDescription>
            打 4 个维度的星(1-5),可选填评论和照片。提交后不可修改。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <RatingRow label="整体评分" value={rating} onChange={setRating} />
          <RatingRow label="专业度" value={pro} onChange={setPro} />
          <RatingRow label="守时" value={punc} onChange={setPunc} />
          <RatingRow label="性价比" value={val} onChange={setVal} />

          <div className="grid gap-1.5">
            <Label htmlFor="r-comment">评论(可选)</Label>
            <Textarea
              id="r-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="说说你的感受、好的地方、需要改进的地方"
            />
          </div>

          <MultiImagePicker
            name="review-images"
            label="照片(可选,最多 6 张)"
            value={images}
            onChange={setImages}
            max={6}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            稍后再评
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "提交中..." : "提交评价"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <StarRating value={value} onChange={onChange} size="lg" />
        <span className="text-muted-foreground w-6 text-sm">
          {value > 0 ? value : "—"}
        </span>
      </div>
    </div>
  )
}
