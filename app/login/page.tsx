import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { LoginForm } from "@/components/shared/LoginForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"

export default async function LoginPage() {
  const session = await getSession()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录</CardTitle>
          <CardDescription>用邮箱和密码进入工作台</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
          <div className="text-muted-foreground mt-6 grid gap-1 text-sm">
            <p>
              还没账号?
              <Link
                href="/register/customer"
                className="ml-1 underline-offset-4 hover:underline"
              >
                顾客注册
              </Link>
              <span className="mx-2">·</span>
              <Link
                href="/register/electrician"
                className="underline-offset-4 hover:underline"
              >
                电工入驻
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
