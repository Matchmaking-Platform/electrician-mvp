import { z } from "zod"

/** 下单时填写的文本字段(图片走 multipart,不在 schema 里) */
export const orderCreateFormSchema = z.object({
  serviceType: z.enum(["维修", "安装", "改造", "其他"]),
  title: z.string().min(2, "标题至少 2 个字").max(80, "标题最多 80 字"),
  description: z
    .string()
    .min(5, "描述至少 5 个字")
    .max(2000, "描述最多 2000 字"),
  address: z.string().min(3, "地址不能为空").max(200),
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90, "经纬度异常"),
  longitude: z.coerce.number().min(-180).max(180, "经纬度异常"),
  /** 期望上门时间。空字符串 = 尽快上门 */
  scheduledAt: z
    .union([z.string().datetime(), z.literal(""), z.undefined()])
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  estimatedPrice: z.coerce
    .number()
    .min(0, "预估价不能为负")
    .max(999999.99)
    .optional(),
})
export type OrderCreateForm = z.infer<typeof orderCreateFormSchema>

/** 顾客 / 电工查订单列表 */
export const orderListSchema = z.object({
  /** 状态过滤,多选用逗号分隔 */
  status: z
    .string()
    .optional()
    .transform((v): string[] | undefined =>
      v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined
    ),
  /** scope=mine(默认)= 当前用户相关;scope=hall = 电工抢单大厅(只对 ELECTRICIAN 有效) */
  scope: z.enum(["mine", "hall"]).optional().default("mine"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})
export type OrderListQuery = z.infer<typeof orderListSchema>
