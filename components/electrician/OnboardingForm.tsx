"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { ImagePicker } from "@/components/shared/ImagePicker"
import {
  MultiImagePicker,
  type MultiItem,
} from "@/components/shared/MultiImagePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type InitialProfile = {
  bio: string | null
  yearsExperience: number
  serviceAreas: string[]
  baseHourlyRate: number
  idCardFront: string | null
  idCardBack: string | null
  facePhoto: string | null
  certifications: string[]
}

export function OnboardingForm({ initial }: { initial: InitialProfile | null }) {
  const router = useRouter()
  const [bio, setBio] = useState(initial?.bio ?? "")
  const [yearsExperience, setYears] = useState(
    String(initial?.yearsExperience ?? 0)
  )
  const [serviceAreas, setServiceAreas] = useState(
    (initial?.serviceAreas ?? []).join(", ")
  )
  const [baseHourlyRate, setRate] = useState(
    String(initial?.baseHourlyRate ?? 0)
  )

  const [front, setFront] = useState<File | string | null>(
    initial?.idCardFront ?? null
  )
  const [back, setBack] = useState<File | string | null>(
    initial?.idCardBack ?? null
  )
  const [face, setFace] = useState<File | string | null>(
    initial?.facePhoto ?? null
  )
  const [certs, setCerts] = useState<MultiItem[]>(
    initial?.certifications ?? []
  )
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!front || !back || !face) {
      toast.error("请上传:身份证正面、身份证背面、人脸照")
      return
    }
    if (!serviceAreas.trim()) {
      toast.error("请填写服务区域")
      return
    }

    setSubmitting(true)
    const fd = new FormData()
    fd.append("bio", bio)
    fd.append("yearsExperience", yearsExperience)
    fd.append("serviceAreas", serviceAreas)
    fd.append("baseHourlyRate", baseHourlyRate)
    if (front instanceof File) fd.append("idCardFront", front)
    if (back instanceof File) fd.append("idCardBack", back)
    if (face instanceof File) fd.append("facePhoto", face)

    const keepCerts = certs.filter((c): c is string => typeof c === "string")
    fd.append("keepCertifications", JSON.stringify(keepCerts))
    for (const c of certs) {
      if (c instanceof File) fd.append("certifications", c)
    }

    try {
      const res = await fetch("/api/electrician/profile", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error?.message ?? "提交失败")
        return
      }
      toast.success("已提交,等待管理员审核")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Label htmlFor="bio">个人简介</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="介绍你的擅长领域、典型案例等(500 字以内)"
          rows={4}
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
            value={yearsExperience}
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
            value={baseHourlyRate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="areas">服务区域</Label>
        <Input
          id="areas"
          value={serviceAreas}
          onChange={(e) => setServiceAreas(e.target.value)}
          placeholder="多个区域用逗号或换行分隔。例:上海市浦东新区, 上海市黄浦区"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ImagePicker
          name="idCardFront"
          label="身份证正面"
          value={front}
          onChange={setFront}
          required
        />
        <ImagePicker
          name="idCardBack"
          label="身份证背面"
          value={back}
          onChange={setBack}
          required
        />
        <ImagePicker
          name="facePhoto"
          label="本人手持身份证人脸照"
          value={face}
          onChange={setFace}
          required
        />
      </div>

      <MultiImagePicker
        name="certifications"
        label="电工证 / 其它资质证书"
        value={certs}
        onChange={setCerts}
        max={6}
      />

      <Button onClick={handleSubmit} disabled={submitting} size="lg">
        {submitting ? "提交中..." : "提交审核"}
      </Button>
    </div>
  )
}
