"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (text.trim().length < 1) {
      toast.error("回复不能为空")
      return
    }
    setBusy(true)
    const res = await fetch(`/api/reviews/${reviewId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: text.trim() }),
    })
    const data = await res.json().catch(() => null)
    setBusy(false)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "回复失败")
      return
    }
    toast.success("已回复")
    setText("")
    router.refresh()
  }

  return (
    <div className="grid gap-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="给顾客一个回复(只能回复一次)"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={busy}>
          {busy ? "提交中..." : "提交回复"}
        </Button>
      </div>
    </div>
  )
}
