import { Prisma } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { withdrawalCreateSchema } from "@/lib/validators/withdrawal"

/**
 * 电工创建提现请求。
 * 用 transaction:在锁定的 profile 行上检查余额并原子扣减,避免并发超提。
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = withdrawalCreateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const { amount, bankInfo } = parsed.data

  try {
    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.electricianProfile.findUnique({
        where: { userId: session.user.id },
        select: { availableBalance: true },
      })
      if (!profile) {
        throw new Error("PROFILE_MISSING")
      }
      const balance = Number(profile.availableBalance)
      if (balance < amount) {
        throw new Error("INSUFFICIENT_BALANCE")
      }
      // 扣余额(锁定),建提现单
      await tx.electricianProfile.update({
        where: { userId: session.user.id },
        data: { availableBalance: { decrement: amount } },
      })
      return tx.withdrawalRequest.create({
        data: {
          electricianId: session.user.id,
          amount,
          status: "PENDING",
          bankInfo: bankInfo as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      })
    })
    return apiOk(
      {
        request: { ...created, amount: Number(created.amount) },
      },
      201
    )
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "INSUFFICIENT_BALANCE") {
        return apiError("CONFLICT", "可用余额不足", 409)
      }
      if (e.message === "PROFILE_MISSING") {
        return apiError("NOT_FOUND", "请先完成入驻", 404)
      }
    }
    throw e
  }
}

/** 列出当前电工自己的提现记录 */
export async function GET() {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }
  const items = await prisma.withdrawalRequest.findMany({
    where: { electricianId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      amount: true,
      status: true,
      adminNote: true,
      createdAt: true,
      processedAt: true,
    },
  })
  return apiOk({
    items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
  })
}
