import { z } from "zod"

/** 电工资料提交(FormData 文本字段 —— 数字用 z.coerce) */
export const electricianProfileFormSchema = z.object({
  bio: z.string().max(500, "简介最多 500 字").optional().default(""),
  yearsExperience: z.coerce
    .number()
    .int("年限填整数")
    .min(0)
    .max(60, "年限范围 0-60")
    .default(0),
  /** 前端传一段 JSON 字符串(string[]),后端解析。也接受 "," 或 "\n" 分隔。 */
  serviceAreas: z
    .string()
    .min(1, "请填写至少一个服务区域")
    .transform((v) => {
      const trimmed = v.trim()
      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            return parsed.map(String).map((s) => s.trim()).filter(Boolean)
          }
        } catch {
          // fall through to split
        }
      }
      return trimmed
        .split(/[,，\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    })
    .pipe(
      z.array(z.string().min(1).max(50)).min(1, "请填写至少一个服务区域").max(20)
    ),
  baseHourlyRate: z.coerce
    .number()
    .min(0, "时薪不能为负")
    .max(99999.99, "时薪过高")
    .default(0),
})

export type ElectricianProfileForm = z.infer<typeof electricianProfileFormSchema>

/** 管理员审核动作 */
export const verifyActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().min(1, "请填写驳回理由").max(500),
  }),
])
export type VerifyAction = z.infer<typeof verifyActionSchema>
