import { z } from "zod"
import { Role } from "@prisma/client"

/** 登录请求 */
export const loginSchema = z.object({
  email: z.email("请填写有效邮箱"),
  password: z.string().min(8, "密码至少 8 位"),
})
export type LoginInput = z.infer<typeof loginSchema>

/** 通用注册基础(顾客/电工共用字段) */
const baseRegister = z.object({
  email: z.email("请填写有效邮箱"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .max(72, "密码不超过 72 字符"),
  name: z.string().min(1, "请填写姓名").max(50),
})

/** 顾客注册 */
export const customerRegisterSchema = baseRegister
export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>

/** 电工注册(MVP 阶段只收基础字段,资质上传走阶段 2) */
export const electricianRegisterSchema = baseRegister
export type ElectricianRegisterInput = z.infer<typeof electricianRegisterSchema>

/** role 类型守卫(NextAuth 回填 session 用) */
export const isRole = (v: unknown): v is Role =>
  v === "CUSTOMER" || v === "ELECTRICIAN" || v === "ADMIN"
