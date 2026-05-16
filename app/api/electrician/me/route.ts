import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { selfProfilePatchSchema } from "@/lib/validators/electrician"

/**
 * 电工自助更新 profile 子集。
 * 只允许更新 bio / yearsExperience / baseHourlyRate / serviceAreas / isOnline。
 * 资质字段(身份证、人脸照、verificationStatus)走专门的 onboarding 流程。
 */
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工账号", 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = selfProfilePatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }

  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) {
    return apiError("NOT_FOUND", "请先完成入驻", 404)
  }

  const data = parsed.data
  const updated = await prisma.electricianProfile.update({
    where: { id: profile.id },
    data: {
      ...data,
      // 切到在线时更新 lastActiveAt
      lastActiveAt: data.isOnline === true ? new Date() : undefined,
    },
    select: {
      id: true,
      bio: true,
      yearsExperience: true,
      baseHourlyRate: true,
      serviceAreas: true,
      isOnline: true,
      lastActiveAt: true,
    },
  })

  return apiOk({
    profile: {
      ...updated,
      baseHourlyRate: Number(updated.baseHourlyRate),
      serviceAreas: (updated.serviceAreas as string[]) ?? [],
    },
  })
}
