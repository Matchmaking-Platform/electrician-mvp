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

// ============================================================
// 顾客端电工列表 / 详情
// ============================================================

/** 列表筛选 + 排序 + 分页 */
export const electricianListSchema = z.object({
  q: z.string().trim().max(50).optional(),
  area: z.string().trim().max(50).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).max(99999.99).optional(),
  maxPrice: z.coerce.number().min(0).max(99999.99).optional(),
  online: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
  sort: z
    .enum(["comprehensive", "rating", "priceAsc", "priceDesc"])
    .optional()
    .default("comprehensive"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
})
export type ElectricianListQuery = z.infer<typeof electricianListSchema>

// ============================================================
// 电工自助:更新基础资料 / Online 开关
// ============================================================

export const selfProfilePatchSchema = z
  .object({
    bio: z.string().max(500).optional(),
    yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
    baseHourlyRate: z.coerce.number().min(0).max(99999.99).optional(),
    serviceAreas: z.array(z.string().min(1).max(50)).min(1).max(20).optional(),
    isOnline: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "请提供至少一个要更新的字段")

export type SelfProfilePatch = z.infer<typeof selfProfilePatchSchema>

// ============================================================
// 案例 / 报价 CRUD
// ============================================================

export const portfolioCaseInputSchema = z.object({
  title: z.string().min(1, "标题必填").max(100),
  description: z.string().max(1000).optional().default(""),
  images: z.array(z.string().min(1)).max(8).optional().default([]),
})
export type PortfolioCaseInput = z.infer<typeof portfolioCaseInputSchema>

export const priceItemInputSchema = z.object({
  serviceType: z.string().min(1).max(30),
  name: z.string().min(1, "名称必填").max(80),
  price: z.coerce.number().min(0).max(99999.99),
  unit: z.string().min(1).max(20),
  description: z.string().max(300).optional().default(""),
})
export type PriceItemInput = z.infer<typeof priceItemInputSchema>
