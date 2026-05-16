import { getSession } from "@/lib/auth"

export default async function AdminHome() {
  const session = await getSession()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">管理员后台</h1>
      <p className="text-muted-foreground mt-2">
        欢迎,{session?.user.name}(占位页面,阶段 8 起做真正的管理功能)
      </p>
    </div>
  )
}
