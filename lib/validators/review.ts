import { z } from "zod"

const stars = z.coerce.number().int().min(1, "至少 1 星").max(5, "最多 5 星")

/** 顾客提交评价(multipart 文本字段;图片走 images[] File) */
export const reviewCreateFormSchema = z.object({
  rating: stars,
  professionalismRating: stars,
  punctualityRating: stars,
  valueRating: stars,
  comment: z
    .string()
    .max(1000, "评论最多 1000 字")
    .optional()
    .transform((v) => v?.trim() ?? ""),
})
export type ReviewCreateForm = z.infer<typeof reviewCreateFormSchema>

/** 电工回复评价(JSON body) */
export const reviewReplySchema = z.object({
  reply: z.string().min(1, "回复不能为空").max(500, "回复最多 500 字"),
})
export type ReviewReply = z.infer<typeof reviewReplySchema>

/** 管理员下架(JSON body) */
export const reviewHideSchema = z.object({
  reason: z.string().min(1, "请填写下架理由").max(500),
})
export type ReviewHide = z.infer<typeof reviewHideSchema>

/** 评价列表查询 */
export const reviewListSchema = z.object({
  minStars: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
})
export type ReviewListQuery = z.infer<typeof reviewListSchema>
