import { VerificationStatus } from "@prisma/client"
import { redirect } from "next/navigation"

import { OrderHall } from "@/components/electrician/OrderHall"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianHallPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== "ELECTRICIAN") {
    redirect("/login")
  }
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { verificationStatus: true, serviceAreas: true },
  })
  if (!profile || profile.verificationStatus !== VerificationStatus.APPROVED) {
    redirect("/electrician/onboarding")
  }

  const areas = (profile.serviceAreas as string[]) ?? []

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">接单大厅</h1>
        <p className="text-muted-foreground text-sm">
          仅显示地址匹配你服务区({areas.join("、") || "未填写"})的待接单订单。
        </p>
      </div>
      <OrderHall />
    </main>
  )
}
