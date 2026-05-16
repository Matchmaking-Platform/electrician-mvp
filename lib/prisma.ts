import { PrismaClient } from "@prisma/client"

// 单例:Next.js 开发模式热加载会反复 new PrismaClient,导致连接池迅速耗尽。
// 用 globalThis 缓存,生产环境每次冷启动 new 一次。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
