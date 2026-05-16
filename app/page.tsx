import Link from "next/link"
import { redirect } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { getSession } from "@/lib/auth"

const ROLE_HOME: Record<string, string> = {
  CUSTOMER: "/customer",
  ELECTRICIAN: "/electrician",
  ADMIN: "/admin",
}

export default async function Home() {
  const session = await getSession()
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role] ?? "/")
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          电工服务撮合平台
        </h1>
        <p className="text-muted-foreground max-w-md text-sm sm:text-base">
          一站式找电工、报价、付款、评价。
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/electricians" className={buttonVariants({ size: "lg" })}>
          先随便看看
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          登录
        </Link>
      </div>
      <div className="text-muted-foreground flex gap-4 text-sm">
        <Link
          href="/register/customer"
          className="underline-offset-4 hover:underline"
        >
          顾客注册
        </Link>
        <span>·</span>
        <Link
          href="/register/electrician"
          className="underline-offset-4 hover:underline"
        >
          电工入驻
        </Link>
      </div>
    </main>
  )
}
