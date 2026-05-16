import Link from "next/link"
import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/shared/RegisterForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSession } from "@/lib/auth"

export default async function ElectricianRegisterPage() {
  const session = await getSession()
  if (session?.user) redirect("/")

  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>电工入驻</CardTitle>
          <CardDescription>
            注册后请上传资质材料(身份证、电工证、人脸照),通过审核后可接单
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm role="electrician" />
          <div className="text-muted-foreground mt-6 text-sm">
            <p>
              已有账号?
              <Link
                href="/login"
                className="ml-1 underline-offset-4 hover:underline"
              >
                去登录
              </Link>
            </p>
            <p className="mt-1">
              我是顾客?
              <Link
                href="/register/customer"
                className="ml-1 underline-offset-4 hover:underline"
              >
                走顾客注册
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
