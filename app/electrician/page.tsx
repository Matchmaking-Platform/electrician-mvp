import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ElectricianHome() {
  const session = await getSession()
  if (!session?.user) return null

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { verificationStatus: true, rejectReason: true },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">电工工作台</h1>
      <p className="text-muted-foreground mt-2">
        欢迎,{session.user.name}
      </p>
      <p className="mt-4 text-sm">
        资质状态:<span className="font-mono">{profile?.verificationStatus ?? "(无资料,请上传)"}</span>
        {profile?.rejectReason ? (
          <span className="text-destructive ml-2">驳回理由:{profile.rejectReason}</span>
        ) : null}
      </p>
      <p className="text-muted-foreground mt-2 text-xs">
        (占位页面,阶段 2 起做真正的入驻流程和工作台)
      </p>
    </div>
  )
}
