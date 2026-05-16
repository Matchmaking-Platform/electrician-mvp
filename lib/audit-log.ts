import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * 管理员操作日志。每次敏感操作都写一条。
 * 失败时不抛错(避免拖垮主流程),只在控制台告警。
 */
export async function logAdminAction(input: {
  adminId: string
  action: string // 例 APPROVE_ELECTRICIAN / REJECT_ELECTRICIAN / BAN_USER
  targetType: string // USER / ORDER / REVIEW ...
  targetId: string
  detail?: Prisma.InputJsonValue
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        detail: input.detail ?? {},
      },
    })
  } catch (err) {
    console.error("[audit-log] failed:", err)
  }
}
