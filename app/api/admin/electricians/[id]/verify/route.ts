import { VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { logAdminAction } from "@/lib/audit-log"
import { getSession } from "@/lib/auth"
import {
  notifyElectricianRejected,
  notifyElectricianVerified,
} from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { verifyActionSchema } from "@/lib/validators/electrician"

/**
 * 管理员对电工资质做审核动作。
 * URL 参数:[id] = ElectricianProfile.id
 * body: { action: "approve" } 或 { action: "reject", reason: string }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "需要管理员权限", 403)
  }

  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = verifyActionSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const profile = await prisma.electricianProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, verificationStatus: true },
  })
  if (!profile) return apiError("NOT_FOUND", "电工资料不存在", 404)

  if (parsed.data.action === "approve") {
    await prisma.electricianProfile.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.APPROVED,
        rejectReason: null,
      },
    })
    await logAdminAction({
      adminId: session.user.id,
      action: "APPROVE_ELECTRICIAN",
      targetType: "ELECTRICIAN_PROFILE",
      targetId: id,
      detail: { previousStatus: profile.verificationStatus },
    })
    await notifyElectricianVerified({ userId: profile.userId })
    return apiOk({ status: "APPROVED" })
  }

  // reject
  await prisma.electricianProfile.update({
    where: { id },
    data: {
      verificationStatus: VerificationStatus.REJECTED,
      rejectReason: parsed.data.reason,
    },
  })
  await logAdminAction({
    adminId: session.user.id,
    action: "REJECT_ELECTRICIAN",
    targetType: "ELECTRICIAN_PROFILE",
    targetId: id,
    detail: {
      reason: parsed.data.reason,
      previousStatus: profile.verificationStatus,
    },
  })
  await notifyElectricianRejected({
    userId: profile.userId,
    reason: parsed.data.reason,
  })
  return apiOk({ status: "REJECTED" })
}
