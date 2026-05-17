import { apiError, apiOk } from "@/lib/api"
import { logAdminAction } from "@/lib/audit-log"
import { getSession } from "@/lib/auth"
import {
  notifyWithdrawalPaid,
  notifyWithdrawalRejected,
} from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { withdrawalDecisionSchema } from "@/lib/validators/withdrawal"

/** 管理员处理提现:打款(paid) 或 驳回(reject,退余额) */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ADMIN") {
    return apiError("FORBIDDEN", "需要管理员权限", 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = withdrawalDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const req0 = await prisma.withdrawalRequest.findUnique({
    where: { id },
    select: {
      id: true,
      electricianId: true,
      amount: true,
      status: true,
    },
  })
  if (!req0) return apiError("NOT_FOUND", "提现单不存在", 404)
  if (req0.status !== "PENDING") {
    return apiError("CONFLICT", "提现已处理过", 409)
  }

  if (parsed.data.action === "paid") {
    await prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: "PAID",
        adminNote: parsed.data.adminNote ?? null,
        processedAt: new Date(),
      },
    })
    await logAdminAction({
      adminId: session.user.id,
      action: "PAY_WITHDRAWAL",
      targetType: "WITHDRAWAL",
      targetId: id,
      detail: {
        amount: Number(req0.amount),
        electricianId: req0.electricianId,
      },
    })
    await notifyWithdrawalPaid({
      electricianId: req0.electricianId,
      amount: Number(req0.amount),
    })
    return apiOk({ status: "PAID" })
  }

  // reject:退余额
  await prisma.$transaction([
    prisma.withdrawalRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote: parsed.data.adminNote,
        processedAt: new Date(),
      },
    }),
    prisma.electricianProfile.update({
      where: { userId: req0.electricianId },
      data: { availableBalance: { increment: Number(req0.amount) } },
    }),
  ])
  await logAdminAction({
    adminId: session.user.id,
    action: "REJECT_WITHDRAWAL",
    targetType: "WITHDRAWAL",
    targetId: id,
    detail: {
      reason: parsed.data.adminNote,
      restoredAmount: Number(req0.amount),
    },
  })
  await notifyWithdrawalRejected({
    electricianId: req0.electricianId,
    amount: Number(req0.amount),
    reason: parsed.data.adminNote,
  })
  return apiOk({ status: "REJECTED" })
}
