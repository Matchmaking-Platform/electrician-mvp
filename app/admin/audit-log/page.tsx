import Link from "next/link"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page ?? "1") || 1)
  const limit = 30
  const skip = (page - 1) * limit

  const [total, items] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        admin: { select: { name: true, email: true } },
      },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Link
        href="/admin"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm"
      >
        ← 返回管理首页
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">操作日志</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            最近操作({total} 条)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              还没有日志
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>管理员</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>目标</TableHead>
                  <TableHead>详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">
                      {timeAgo(l.createdAt)}
                    </TableCell>
                    <TableCell>{l.admin.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted rounded px-1 text-xs">
                        {l.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.targetType} / {l.targetId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      <code className="text-muted-foreground line-clamp-2 text-xs whitespace-pre-wrap">
                        {JSON.stringify(l.detail)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 ? (
            <div className="text-muted-foreground mt-4 flex items-center justify-end gap-3 text-sm">
              <span>
                {page} / {totalPages} 页
              </span>
              {page > 1 ? (
                <Link
                  href={`/admin/audit-log?page=${page - 1}`}
                  className="underline-offset-4 hover:underline"
                >
                  上一页
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`/admin/audit-log?page=${page + 1}`}
                  className="underline-offset-4 hover:underline"
                >
                  下一页
                </Link>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
