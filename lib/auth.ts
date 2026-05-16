import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import { loginSchema } from "@/lib/validators/auth"
import type { Role } from "@prisma/client"

export type AuthorizedUser = {
  id: string
  email: string
  name: string
  role: Role
  image: string | null
}

/**
 * 校验邮箱 + 密码,成功返回 user 对象,失败返回 null。
 * 抽成独立函数便于单元测试(Credentials Provider 把它包成 `authorize`)。
 */
export async function verifyCredentials(
  credentials: unknown
): Promise<AuthorizedUser | null> {
  const parsed = loginSchema.safeParse(credentials)
  if (!parsed.success) return null
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (!user || user.isBanned) return null

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    image: user.avatarUrl ?? null,
  }
}

/**
 * NextAuth 配置。
 * - 策略:JWT(Credentials Provider 不能用 database session)
 * - Session 中携带 id 和 role,供路由保护和 UI 判断使用
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      authorize: verifyCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时 user 才存在,后续刷新 token 时只有 token
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
}

/** 服务端取 session 的助手 */
export const getSession = () => getServerSession(authOptions)
