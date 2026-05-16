import { getSession } from "@/lib/auth"

export default async function CustomerHome() {
  const session = await getSession()
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">顾客工作台</h1>
      <p className="text-muted-foreground mt-2">
        欢迎,{session?.user.name}(占位页面,阶段 3 之后填充)
      </p>
    </div>
  )
}
