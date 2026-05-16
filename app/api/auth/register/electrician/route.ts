import bcrypt from "bcryptjs"

import { apiError, apiOk, getClientIp } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rate-limit"
import { electricianRegisterSchema } from "@/lib/validators/auth"

const SALT_ROUNDS = 12

/**
 * 电工注册:创建 User + 空 ElectricianProfile(verificationStatus=PENDING)。
 * 资质材料在阶段 2 的入驻页上传。
 */
export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`register-electrician:${ip}`, 5, 10 * 60_000)
  if (!rl.ok) {
    return apiError(
      "RATE_LIMITED",
      `请求过于频繁,请 ${rl.retryAfter} 秒后重试`,
      429
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = electricianRegisterSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const { email, password, name } = parsed.data
  const lowerEmail = email.toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email: lowerEmail },
    select: { id: true },
  })
  if (existing) {
    return apiError("EMAIL_TAKEN", "该邮箱已被注册", 409)
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: {
      email: lowerEmail,
      passwordHash,
      name,
      role: "ELECTRICIAN",
      electricianProfile: {
        create: {
          // 资质字段全部留空,等用户在阶段 2 上传
        },
      },
    },
    select: { id: true, email: true, name: true, role: true },
  })

  return apiOk({ user }, 201)
}
