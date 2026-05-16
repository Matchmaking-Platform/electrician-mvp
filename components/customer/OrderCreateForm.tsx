"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import dynamic from "next/dynamic"
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const MapPicker = dynamic(() => import("@/components/shared/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="bg-muted h-[300px] w-full animate-pulse rounded-md" />
  ),
})

const STEPS = ["服务类型", "问题描述", "地址 + 地图", "时间 + 价格", "确认提交"]
const SERVICE_TYPES = ["维修", "安装", "改造", "其他"] as const

type Step = 0 | 1 | 2 | 3 | 4

export function OrderCreateForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [serviceType, setServiceType] = useState<string>("维修")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<MultiItem[]>([])
  const [address, setAddress] = useState("")
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [scheduledAt, setScheduledAt] = useState("") // datetime-local
  const [estimatedPrice, setEstimatedPrice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function validate(s: Step): string | null {
    if (s === 0) {
      if (!SERVICE_TYPES.includes(serviceType as (typeof SERVICE_TYPES)[number])) {
        return "请选择服务类型"
      }
    }
    if (s === 1) {
      if (title.trim().length < 2) return "标题至少 2 个字"
      if (description.trim().length < 5) return "描述至少 5 个字"
    }
    if (s === 2) {
      if (address.trim().length < 3) return "请填写详细地址"
      if (!coord) return "请在地图上点选位置"
    }
    return null
  }

  function next() {
    const err = validate(step)
    if (err) {
      toast.error(err)
      return
    }
    setStep((s) => (s < 4 ? ((s + 1) as Step) : s))
  }
  function back() {
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s))
  }

  async function handleSubmit() {
    // 再次校验所有步骤
    for (const s of [0, 1, 2] as Step[]) {
      const err = validate(s)
      if (err) {
        toast.error(err)
        setStep(s)
        return
      }
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append("serviceType", serviceType)
    fd.append("title", title)
    fd.append("description", description)
    fd.append("address", address)
    fd.append("latitude", String(coord!.lat))
    fd.append("longitude", String(coord!.lng))
    if (scheduledAt) {
      // datetime-local 给的是不带时区的本地时间字符串,转 ISO
      const dt = new Date(scheduledAt)
      if (!Number.isNaN(dt.getTime())) {
        fd.append("scheduledAt", dt.toISOString())
      }
    }
    if (estimatedPrice.trim()) {
      fd.append("estimatedPrice", estimatedPrice)
    }
    for (const i of images) if (i instanceof File) fd.append("images", i)

    const res = await fetch("/api/orders", {
      method: "POST",
      body: fd,
    })
    setSubmitting(false)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(data?.error?.message ?? "下单失败")
      return
    }
    toast.success("订单已发布,等待师傅接单")
    router.replace(`/customer/orders/${data.order.id}`)
  }

  return (
    <div className="grid gap-4">
      {/* 进度条 */}
      <div className="flex items-center gap-1 text-xs">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={
              "flex-1 rounded-full px-2 py-1 text-center " +
              (i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-muted text-foreground"
                  : "bg-muted/40 text-muted-foreground")
            }
          >
            {i + 1}. {s}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step]}</CardTitle>
          <CardDescription>第 {step + 1} / {STEPS.length} 步</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 ? (
            <div className="grid gap-2">
              <Label>服务类型</Label>
              <Select
                value={serviceType}
                onValueChange={(v) => v && setServiceType(v)}
              >
                <SelectTrigger className="w-full sm:w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="o-title">标题</Label>
                <Input
                  id="o-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="一句话概括,例:卫生间灯不亮"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-desc">详细描述</Label>
                <Textarea
                  id="o-desc"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="发生时间、症状、已尝试的排查动作等"
                />
              </div>
              <MultiImagePicker
                name="o-images"
                label="问题图片(可选)"
                value={images}
                onChange={setImages}
                max={6}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="o-addr">详细地址</Label>
                <Input
                  id="o-addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="例:上海市浦东新区张江路 88 号"
                />
              </div>
              <Label>在地图上点选位置</Label>
              <MapPicker value={coord} onChange={setCoord} />
              {coord ? (
                <p className="text-muted-foreground text-xs">
                  经纬度:{coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  点击地图任意位置标记师傅上门的地点
                </p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="o-when">期望上门时间(可选)</Label>
                <Input
                  id="o-when"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  留空则表示「尽快上门」。
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="o-price">预算(可选,元)</Label>
                <Input
                  id="o-price"
                  type="number"
                  min={0}
                  step="1"
                  value={estimatedPrice}
                  onChange={(e) => setEstimatedPrice(e.target.value)}
                  placeholder="心理预期价格,师傅看到后报价更准"
                />
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3 text-sm">
              <Row label="服务类型" value={serviceType} />
              <Row label="标题" value={title} />
              <Row label="描述" value={description} multiline />
              <Row label="图片" value={`${images.length} 张`} />
              <Row label="地址" value={address} />
              <Row
                label="经纬度"
                value={
                  coord
                    ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
                    : "—"
                }
              />
              <Row
                label="期望时间"
                value={scheduledAt ? scheduledAt.replace("T", " ") : "尽快"}
              />
              <Row
                label="预算"
                value={estimatedPrice ? `¥${estimatedPrice}` : "未填(等师傅报价)"}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0}>
          <ChevronLeft className="size-4" />
          上一步
        </Button>
        {step < 4 ? (
          <Button onClick={next}>
            下一步
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "确认发布"}
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={multiline ? "whitespace-pre-wrap" : ""}>{value}</span>
    </div>
  )
}
