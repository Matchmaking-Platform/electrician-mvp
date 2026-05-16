import { VerificationStatus } from "@prisma/client"
import { redirect } from "next/navigation"

import { OnboardingForm } from "@/components/electrician/OnboardingForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function StatusBanner({ kind, text }: { kind: "wait" | "rejected"; text?: string }) {
  if (kind === "wait") {
    return (
      <Card className="border-amber-500/40 bg-amber-50/60 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="text-amber-700 dark:text-amber-300">
            审核中
          </CardTitle>
          <CardDescription className="text-amber-800/80 dark:text-amber-300/80">
            管理员正在核对你的资质材料,通过后即可接单。一般 1-2 个工作日内有结果。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-destructive">资料被驳回</CardTitle>
        <CardDescription>{text ?? "请修改后重新提交。"}</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default async function OnboardingPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") {
    redirect("/login")
  }
  const userId = session.user.id

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId },
  })

  // 已通过 → 工作台
  if (profile?.verificationStatus === VerificationStatus.APPROVED) {
    redirect("/electrician")
  }

  const hasAllDocs = !!(
    profile?.idCardFront && profile.idCardBack && profile.facePhoto
  )
  const isWaiting =
    profile?.verificationStatus === VerificationStatus.PENDING && hasAllDocs
  const isRejected =
    profile?.verificationStatus === VerificationStatus.REJECTED

  const initial = profile
    ? {
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        serviceAreas: (profile.serviceAreas as string[]) ?? [],
        baseHourlyRate: Number(profile.baseHourlyRate),
        idCardFront: profile.idCardFront,
        idCardBack: profile.idCardBack,
        facePhoto: profile.facePhoto,
        certifications: (profile.certifications as string[]) ?? [],
      }
    : null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">电工入驻</h1>
        <p className="text-muted-foreground text-sm">
          欢迎,{session.user.name}。上传资质后等待管理员审核。
        </p>
      </div>

      {isWaiting ? (
        <div className="space-y-6">
          <StatusBanner kind="wait" />
          <Card>
            <CardHeader>
              <CardTitle>已提交的资料</CardTitle>
              <CardDescription>如需修改,直接覆盖后再次提交。</CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingForm initial={initial} />
            </CardContent>
          </Card>
        </div>
      ) : isRejected ? (
        <div className="space-y-6">
          <StatusBanner
            kind="rejected"
            text={profile?.rejectReason ?? "请按驳回理由修改后重新提交。"}
          />
          <Card>
            <CardHeader>
              <CardTitle>重新提交</CardTitle>
            </CardHeader>
            <CardContent>
              <OnboardingForm initial={initial} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>填写资料并上传证件</CardTitle>
            <CardDescription>
              所有图片仅用于管理员审核,审核通过后顾客侧不会展示身份证图片。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm initial={initial} />
          </CardContent>
        </Card>
      )}
    </main>
  )
}
