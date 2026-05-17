import { Role } from "@prisma/client"
import Link from "next/link"

import { BanUserButton } from "@/components/admin/BanUserButton"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { timeAgo } from "@/lib/order-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "顾客",
  ELECTRICIAN: "电工",
  ADMIN: "管理员",
}

async function loadUsers(role: Role | null, q: string) {
  return prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  })
}

type Row = Awaited<ReturnType<typeof loadUsers>>[number]

function UsersTable({ items }: { items: Row[] }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        没有匹配用户
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>姓名</TableHead>
          <TableHead>邮箱</TableHead>
          <TableHead>角色</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>注册</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((u) => (
          <TableRow key={u.id}>
            <TableCell>{u.name}</TableCell>
            <TableCell>{u.email}</TableCell>
            <TableCell>{ROLE_LABEL[u.role]}</TableCell>
            <TableCell>
              {u.isBanned ? (
                <Badge variant="destructive">已封禁</Badge>
              ) : (
                <Badge variant="secondary">正常</Badge>
              )}
            </TableCell>
            <TableCell>{timeAgo(u.createdAt)}</TableCell>
            <TableCell className="text-right">
              {u.role === "ADMIN" ? (
                <span className="text-muted-foreground text-xs">—</span>
              ) : (
                <BanUserButton userId={u.id} isBanned={u.isBanned} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim()

  const [customers, electricians, admins] = await Promise.all([
    loadUsers(Role.CUSTOMER, q),
    loadUsers(Role.ELECTRICIAN, q),
    loadUsers(Role.ADMIN, q),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">用户管理</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">用户列表</CardTitle>
          <form action="/admin/users" className="max-w-xs flex-1">
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="搜索姓名或邮箱后回车"
            />
          </form>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="customer">
            <TabsList>
              <TabsTrigger value="customer">
                顾客 ({customers.length})
              </TabsTrigger>
              <TabsTrigger value="electrician">
                电工 ({electricians.length})
              </TabsTrigger>
              <TabsTrigger value="admin">
                管理员 ({admins.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="customer" className="mt-4">
              <UsersTable items={customers} />
            </TabsContent>
            <TabsContent value="electrician" className="mt-4">
              <UsersTable items={electricians} />
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <UsersTable items={admins} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  )
}
