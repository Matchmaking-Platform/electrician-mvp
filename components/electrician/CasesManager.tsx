"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import {
  MultiImagePicker,
  type MultiItem,
} from "@/components/shared/MultiImagePicker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export type CaseItem = {
  id: string
  title: string
  description: string
  images: string[]
}

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; item: CaseItem }

export function CasesManager({ initial }: { initial: CaseItem[] }) {
  const router = useRouter()
  const [state, setState] = useState<DialogState>({ mode: "closed" })

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个案例?")) return
    const res = await fetch(`/api/electrician/me/cases/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? "删除失败")
      return
    }
    toast.success("已删除")
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setState({ mode: "create" })}>
          <Plus className="size-4" />
          新增案例
        </Button>
      </div>
      {initial.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          还没有案例。添加 3-5 个典型项目能显著提升曝光。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {c.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {c.images.slice(0, 3).map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={u}
                        alt=""
                        className="aspect-square w-full rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                {c.description ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {c.description}
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState({ mode: "edit", item: c })}
                  >
                    <Pencil className="size-3" />
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="size-3" />
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={state.mode !== "closed"}
        onOpenChange={(o) => {
          if (!o) setState({ mode: "closed" })
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {state.mode === "edit" ? "编辑案例" : "新增案例"}
            </DialogTitle>
            <DialogDescription>
              图片最多 8 张,单张 ≤ 5MB
            </DialogDescription>
          </DialogHeader>
          {state.mode !== "closed" ? (
            <CaseForm
              key={state.mode === "edit" ? state.item.id : "create"}
              initial={state.mode === "edit" ? state.item : null}
              onDone={() => {
                setState({ mode: "closed" })
                router.refresh()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CaseForm({
  initial,
  onDone,
}: {
  initial: CaseItem | null
  onDone: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [images, setImages] = useState<MultiItem[]>(initial?.images ?? [])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("标题必填")
      return
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append("title", title)
    fd.append("description", description)
    const keep = images.filter((i): i is string => typeof i === "string")
    fd.append("keepImages", JSON.stringify(keep))
    for (const i of images) if (i instanceof File) fd.append("images", i)

    const url = initial
      ? `/api/electrician/me/cases/${initial.id}`
      : `/api/electrician/me/cases`
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      body: fd,
    })
    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      toast.error(data?.error?.message ?? "保存失败")
      return
    }
    toast.success("已保存")
    onDone()
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="case-title">标题</Label>
        <Input
          id="case-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例:三室两厅强电改造"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="case-desc">描述</Label>
        <Textarea
          id="case-desc"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="详细描述项目内容、规模、亮点"
        />
      </div>
      <MultiImagePicker
        name="case-images"
        label="案例图片"
        value={images}
        onChange={setImages}
        max={8}
      />
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </div>
  )
}
