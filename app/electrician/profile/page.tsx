import { VerificationStatus } from "@prisma/client"
import { redirect } from "next/navigation"

import { SelfProfileTabs } from "@/components/electrician/SelfProfileTabs"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianProfileEditPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") redirect("/login")

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      baseHourlyRate: true,
      serviceAreas: true,
      isOnline: true,
      verificationStatus: true,
      portfolioCases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          images: true,
        },
      },
      priceItems: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serviceType: true,
          name: true,
          price: true,
          unit: true,
          description: true,
        },
      },
    },
  })
  // 没 profile 或没通过审核 → 不允许编辑公开资料
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    redirect("/electrician/onboarding")
  }

  const initial = {
    bio: profile.bio ?? "",
    yearsExperience: profile.yearsExperience,
    baseHourlyRate: Number(profile.baseHourlyRate),
    serviceAreas: (profile.serviceAreas as string[]) ?? [],
    isOnline: profile.isOnline,
    cases: profile.portfolioCases.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description ?? "",
      images: (c.images as string[]) ?? [],
    })),
    prices: profile.priceItems.map((p) => ({
      id: p.id,
      serviceType: p.serviceType,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      description: p.description ?? "",
    })),
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">个人主页</h1>
        <p className="text-muted-foreground text-sm">
          顾客在电工列表/详情看到的就是这些信息。
        </p>
      </div>
      <SelfProfileTabs initial={initial} />
    </main>
  )
}
