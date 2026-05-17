import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-6xl font-light">404</p>
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p className="text-muted-foreground text-sm">
        你访问的页面可能已被删除,或者链接错了。
      </p>
      <div className="flex gap-2">
        <Link href="/" className={buttonVariants()}>
          回首页
        </Link>
        <Link
          href="/electricians"
          className={buttonVariants({ variant: "outline" })}
        >
          浏览电工
        </Link>
      </div>
    </main>
  )
}
