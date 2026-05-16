"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

export type PriceItem = {
  id: string
  serviceType: string
  name: string
  price: number
  unit: string
  description: string
}

type DialogState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; item: PriceItem }

export function PricesManager({ initial }: { initial: PriceItem[] }) {
  const router = useRouter()
  const [state, setState] = useState<DialogState>({ mode: "closed" })

  async function handleDelete(id: string) {
    if (!confirm("确定删除这个报价项?")) return
    const res = await fetch(`/api/electrician/me/prices/${id}`, {
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
          新增报价
        </Button>
      </div>
      {initial.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          还没有报价项。常见做法是按「维修 / 安装 / 改造」分类列价。
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类别</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>价格</TableHead>
              <TableHead>计价单位</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.serviceType}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>¥{p.price.toFixed(2)}</TableCell>
                <TableCell>/ {p.unit}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setState({ mode: "edit", item: p })}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={state.mode !== "closed"}
        onOpenChange={(o) => {
          if (!o) setState({ mode: "closed" })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {state.mode === "edit" ? "编辑报价" : "新增报价"}
            </DialogTitle>
          </DialogHeader>
          {state.mode !== "closed" ? (
            <PriceForm
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

function PriceForm({
  initial,
  onDone,
}: {
  initial: PriceItem | null
  onDone: () => void
}) {
  const [serviceType, setServiceType] = useState(initial?.serviceType ?? "维修")
  const [name, setName] = useState(initial?.name ?? "")
  const [price, setPrice] = useState(String(initial?.price ?? 0))
  const [unit, setUnit] = useState(initial?.unit ?? "项")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("请填名称")
      return
    }
    const priceNum = Number(price)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("价格不合法")
      return
    }
    setSubmitting(true)
    const url = initial
      ? `/api/electrician/me/prices/${initial.id}`
      : `/api/electrician/me/prices`
    const res = await fetch(url, {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType: serviceType.trim(),
        name: name.trim(),
        price: priceNum,
        unit: unit.trim(),
        description,
      }),
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
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="p-type">类别</Label>
          <Input
            id="p-type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="维修 / 安装 / 改造"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-name">名称</Label>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例:插座/开关安装"
          />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="p-price">价格(元)</Label>
          <Input
            id="p-price"
            type="number"
            min={0}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-unit">单位</Label>
          <Input
            id="p-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="项 / 个 / 小时 / 次"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="p-desc">描述(可选)</Label>
        <Textarea
          id="p-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </div>
  )
}
