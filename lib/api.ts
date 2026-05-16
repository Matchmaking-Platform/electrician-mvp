import { NextResponse } from "next/server"

export type ApiErrorBody = {
  error: { code: string; message: string }
}

/** 统一错误响应:{ error: { code, message } } */
export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json<ApiErrorBody>(
    { error: { code, message } },
    { status }
  )
}

/** 成功响应 */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json<T>(data, { status })
}

/** 从请求中取客户端 IP(简化版,生产应配合可信代理) */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}
