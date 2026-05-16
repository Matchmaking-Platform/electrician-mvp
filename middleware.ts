/**
 * 路由保护中间件。
 * 规则:
 *   /customer/**   → 仅 CUSTOMER
 *   /electrician/** → 仅 ELECTRICIAN
 *   /admin/**       → 仅 ADMIN
 * 未登录访问被保护路由 → 跳到 /login
 * 错角色访问 → 跳到 /login(MVP 简化,后期可换 403 页)
 */
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const ROLE_PREFIX: Record<string, "CUSTOMER" | "ELECTRICIAN" | "ADMIN"> = {
  "/customer": "CUSTOMER",
  "/electrician": "ELECTRICIAN",
  "/admin": "ADMIN",
}

function matchedPrefix(pathname: string) {
  for (const prefix of Object.keys(ROLE_PREFIX)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return prefix
    }
  }
  return null
}

export default withAuth(
  function middleware(req) {
    const prefix = matchedPrefix(req.nextUrl.pathname)
    if (!prefix) return NextResponse.next()

    const expected = ROLE_PREFIX[prefix]
    const token = req.nextauth.token
    if (!token || token.role !== expected) {
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("callbackUrl", req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      // 这里只决定是否触发上面的 middleware 函数;true = 触发(包括未登录)
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ["/customer/:path*", "/electrician/:path*", "/admin/:path*"],
}
