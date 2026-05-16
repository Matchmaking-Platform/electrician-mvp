import { VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"
import { electricianProfileFormSchema } from "@/lib/validators/electrician"

/**
 * 上传/更新电工资质资料。
 * - 鉴权:仅 ELECTRICIAN
 * - 三件必传图(idCardFront/idCardBack/facePhoto):首次提交必须全有;
 *   若已存在(再提交)则可省略,沿用旧值。
 * - 证书图:0-6 张,客户端在 "keepCertifications" 字段以 JSON 数组传"保留的旧 URL",
 *   新文件用 certifications[] 多字段传。
 * - 状态机:无 profile → 新建 PENDING;REJECTED → 翻回 PENDING + 清 rejectReason;
 *   PENDING/APPROVED → 保持原 status(允许审核中或已通过的人微调资料,以 PENDING 为安全)。
 */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工账号可提交资质", 403)
  }
  const userId = session.user.id

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误(需要 multipart/form-data)", 400)
  }

  // 文本字段 Zod 校验
  const parsed = electricianProfileFormSchema.safeParse({
    bio: form.get("bio") ?? "",
    yearsExperience: form.get("yearsExperience") ?? "0",
    serviceAreas: form.get("serviceAreas") ?? "",
    baseHourlyRate: form.get("baseHourlyRate") ?? "0",
  })
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const { bio, yearsExperience, serviceAreas, baseHourlyRate } = parsed.data

  // 取已存在的 profile(决定哪些图必传)
  const existing = await prisma.electricianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      idCardFront: true,
      idCardBack: true,
      facePhoto: true,
      certifications: true,
      verificationStatus: true,
    },
  })

  // ----- 处理单张图(idCardFront/Back, facePhoto) -----
  const subdir = `electrician/${userId}`
  async function pickOrKeep(field: string, oldUrl: string | null) {
    const file = form.get(field)
    if (file instanceof File && file.size > 0) {
      const res = await saveImage({ file, subdir })
      if (!res.ok) return { ok: false as const, error: `${field}: ${res.error}` }
      return { ok: true as const, url: res.url }
    }
    // 没传新文件,沿用旧值
    return { ok: true as const, url: oldUrl }
  }

  const fronts = await pickOrKeep("idCardFront", existing?.idCardFront ?? null)
  if (!fronts.ok) return apiError("INVALID_INPUT", fronts.error, 400)
  const backs = await pickOrKeep("idCardBack", existing?.idCardBack ?? null)
  if (!backs.ok) return apiError("INVALID_INPUT", backs.error, 400)
  const face = await pickOrKeep("facePhoto", existing?.facePhoto ?? null)
  if (!face.ok) return apiError("INVALID_INPUT", face.error, 400)

  // ----- 处理证书数组 -----
  const keepCertsRaw = form.get("keepCertifications")
  let keptCerts: string[] = []
  if (typeof keepCertsRaw === "string" && keepCertsRaw.trim()) {
    try {
      const parsed = JSON.parse(keepCertsRaw)
      if (Array.isArray(parsed)) {
        keptCerts = parsed.map(String).filter((s) => s.startsWith("/uploads/"))
      }
    } catch {
      return apiError("INVALID_INPUT", "keepCertifications 不是合法 JSON 数组", 400)
    }
  }
  const newCertFiles = form
    .getAll("certifications")
    .filter((v): v is File => v instanceof File && v.size > 0)
  const newCertUrls: string[] = []
  for (const f of newCertFiles) {
    const res = await saveImage({ file: f, subdir })
    if (!res.ok) return apiError("INVALID_INPUT", `证书: ${res.error}`, 400)
    newCertUrls.push(res.url)
  }
  const certifications = [...keptCerts, ...newCertUrls].slice(0, 6)

  // 首次提交必须三件齐全
  if (!fronts.url || !backs.url || !face.url) {
    return apiError(
      "INVALID_INPUT",
      "首次提交需上传:身份证正面、身份证背面、人脸照",
      400
    )
  }

  // 状态变迁
  const nextStatus =
    existing?.verificationStatus === VerificationStatus.REJECTED
      ? VerificationStatus.PENDING
      : (existing?.verificationStatus ?? VerificationStatus.PENDING)

  const updated = await prisma.electricianProfile.upsert({
    where: { userId },
    update: {
      bio,
      yearsExperience,
      serviceAreas,
      baseHourlyRate,
      idCardFront: fronts.url,
      idCardBack: backs.url,
      facePhoto: face.url,
      certifications,
      verificationStatus: nextStatus,
      rejectReason: nextStatus === VerificationStatus.PENDING ? null : undefined,
    },
    create: {
      userId,
      bio,
      yearsExperience,
      serviceAreas,
      baseHourlyRate,
      idCardFront: fronts.url,
      idCardBack: backs.url,
      facePhoto: face.url,
      certifications,
      verificationStatus: VerificationStatus.PENDING,
    },
    select: {
      id: true,
      verificationStatus: true,
    },
  })

  return apiOk({ profile: updated })
}
