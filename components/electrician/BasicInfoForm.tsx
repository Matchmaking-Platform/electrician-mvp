"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  initial: {
    bio: string
    yearsExperience: number
    baseHourlyRate: number
    serviceAreas: string[]
    isOnline: boolean
  }
}

export function BasicInfoForm({ initial }: Props) {
  const router = useRouter()
  const [bio, setBio] = useState(initial.bio)
  const [years, setYears] = useState(String(initial.yearsExperience))
  const [rate, setRate] = useState(String(initial.baseHourlyRate))
  const [areas, setAreas] = useState(initial.serviceAreas.join(", "))
  const [online, setOnline] = useState(initial.isOnline)
  const [submitting, setSubmitting] = useState(false)

  function parseAreas(input: string): string[] {
    return input
      .split(/[,,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch("/api/electrician/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data?.error?.message ?? "保存失败")
      return false
    }
    return true
  }

  async function handleSave() {
    const yearsNum = Number(years)
    const rateNum = Number(rate)
    if (!Number.isInteger(yearsNum) || yearsNum < 0 || yearsNum > 60) {
      toast.error("从业年限填 0–60 的整数")
      return
    }
    if (rateNum < 0) {
      toast.error("时薪不能为负")
      return
    }
    const areaList = parseAreas(areas)
    if (areaList.length === 0) {
      toast.error("请至少填一个服务区域")
      return
    }
    setSubmitting(true)
    const ok = await patch({
      bio,
      yearsExperience: yearsNum,
      baseHourlyRate: rateNum,
      serviceAreas: areaList,
    })
    setSubmitting(false)
    if (ok) {
      toast.success("已保存")
      router.refresh()
    }
  }

  async function handleToggleOnline(next: boolean) {
    setOnline(next)
    const ok = await patch({ isOnline: next })
    if (!ok) {
      setOnline(!next) // 回滚
      return
    }
    toast.success(next ? "已上线接单" : "已下线")
  }

  return (
    <div className="grid gap-6">
      <div className="bg-muted/30 flex items-center justify-between rounded-md p-4">
        <div>
          <p className="font-medium">接单状态</p>
          <p className="text-muted-foreground text-sm">
            打开后,在线的顾客可以在列表筛选到你。
          </p>
        </div>
        <Switch checked={online} onCheckedChange={handleToggleOnline} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">个人简介</Label>
        <Textarea
          id="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="500 字以内,说说你的专长、典型项目"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="years">从业年限</Label>
          <Input
            id="years"
            type="number"
            min={0}
            max={60}
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rate">参考时薪(元/小时)</Label>
          <Input
            id="rate"
            type="number"
            min={0}
            step="1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="areas">服务区域</Label>
        <Input
          id="areas"
          value={areas}
          onChange={(e) => setAreas(e.target.value)}
          placeholder="多个区域用逗号或换行分隔"
        />
      </div>

      <Button onClick={handleSave} disabled={submitting} size="lg">
        {submitting ? "保存中..." : "保存"}
      </Button>
    </div>
  )
}
