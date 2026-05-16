import { VerificationStatus } from "@prisma/client"
import Link from "next/link"
import { notFound } from "next/navigation"

import { VerificationActions } from "@/components/admin/VerificationActions"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

const STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
}
const STATUS_VARIANT: Record<
  VerificationStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "default",
  APPROVED: "secondary",
  REJECTED: "destructive",
}

function ImageBlock({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="grid gap-1">
      <div className="text-muted-foreground text-xs">{label}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className="bg-muted aspect-video w-full rounded-md object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-md text-xs">
          未上传
        </div>
      )}
    </div>
  )
}

export default async function AdminElectricianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const profile = await prisma.electricianProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          email: true,
          name: true,
          phone: true,
          createdAt: true,
          isBanned: true,
        },
      },
    },
  })
  if (!profile) notFound()

  const certs = (profile.certifications as string[]) ?? []

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/electricians"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← 返回列表
        </Link>
        <Badge variant={STATUS_VARIANT[profile.verificationStatus]}>
          {STATUS_LABEL[profile.verificationStatus]}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{profile.user.name}</CardTitle>
          <p className="text-muted-foreground text-sm">{profile.user.email}</p>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div>
            从业年限:<span className="font-medium">{profile.yearsExperience} 年</span>
          </div>
          <div>
            参考时薪:<span className="font-medium">¥{Number(profile.baseHourlyRate).toFixed(2)} / 小时</span>
          </div>
          <div>
            服务区域:
            <span className="font-medium">
              {((profile.serviceAreas as string[]) ?? []).join("、") || "—"}
            </span>
          </div>
          {profile.bio ? (
            <div>
              简介:
              <p className="bg-muted/40 mt-1 rounded-md p-2 whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          ) : null}
          {profile.verificationStatus === VerificationStatus.REJECTED &&
          profile.rejectReason ? (
            <div className="text-destructive">
              当前驳回理由:{profile.rejectReason}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>证件</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <ImageBlock label="身份证正面" src={profile.idCardFront} />
          <ImageBlock label="身份证背面" src={profile.idCardBack} />
          <ImageBlock label="人脸照" src={profile.facePhoto} />
        </CardContent>
      </Card>

      {certs.length ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>电工证 / 其它资质</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {certs.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`证书 ${i + 1}`}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>审核操作</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationActions
            profileId={profile.id}
            status={profile.verificationStatus}
          />
        </CardContent>
      </Card>
    </main>
  )
}
