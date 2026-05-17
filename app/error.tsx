"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 错误日志:生产可接入 Sentry
    console.error("[error-boundary]", error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">出错了</h1>
      <p className="text-muted-foreground text-sm">
        页面加载或操作失败,请稍后重试。如果反复出现,请联系客服。
      </p>
      {error.digest ? (
        <code className="bg-muted rounded px-2 py-1 text-xs">
          ID: {error.digest}
        </code>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>重试</Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/"
          }}
        >
          回首页
        </Button>
      </div>
    </main>
  )
}
