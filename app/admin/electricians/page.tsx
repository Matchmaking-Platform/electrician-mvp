import { VerificationStatus } from "@prisma/client"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
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
import { prisma } from "@/lib/prisma"

const STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已驳回",
}

const STATUS_VARIANT: Record<
  VerificationStatus,
  "default" | "secondary" | "destructive"
> = {
  PENDING: "default",
  APPROVED: "secondary",
  REJECTED: "destructive",
}

async function loadByStatus(status: VerificationStatus | null) {
  return prisma.electricianProfile.findMany({
    where: status ? { verificationStatus: status } : {},
    orderBy: { updatedAt: "desc" },
    include: {
      user: {
        select: { id: true, email: true, name: true, createdAt: true },
      },
    },
    take: 100,
  })
}

type RowData = Awaited<ReturnType<typeof loadByStatus>>[number]

function StatusRow({ items }: { items: RowData[] }) {
  if (!items.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        没有数据
      </p>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>姓名</TableHead>
          <TableHead>邮箱</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>提交时间</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{p.user.name}</TableCell>
            <TableCell>{p.user.email}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[p.verificationStatus]}>
                {STATUS_LABEL[p.verificationStatus]}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(p.updatedAt).toLocaleString("zh-CN")}
            </TableCell>
            <TableCell className="text-right">
              <Link
                href={`/admin/electricians/${p.id}`}
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                查看
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function AdminElectriciansPage() {
  const [pending, approved, rejected] = await Promise.all([
    loadByStatus(VerificationStatus.PENDING),
    loadByStatus(VerificationStatus.APPROVED),
    loadByStatus(VerificationStatus.REJECTED),
  ])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">电工资质审核</h1>
        <p className="text-muted-foreground text-sm">
          每次操作都会写入审计日志。
        </p>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            待审核 ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            已通过 ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            已驳回 ({rejected.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <StatusRow items={pending} />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <StatusRow items={approved} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <StatusRow items={rejected} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
