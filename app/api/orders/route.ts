import { OrderStatus, VerificationStatus } from "@prisma/client"

import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"
import {
  orderCreateFormSchema,
  orderListSchema,
} from "@/lib/validators/order"

const COMMISSION_RATE = Number(
  process.env.PLATFORM_COMMISSION_RATE ?? "0"
) || 0

/** 顾客下单 —— multipart:文本字段 + images[] */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "CUSTOMER") {
    return apiError("FORBIDDEN", "仅顾客可下单", 403)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }

  const parsed = orderCreateFormSchema.safeParse({
    serviceType: form.get("serviceType"),
    title: form.get("title"),
    description: form.get("description"),
    address: form.get("address"),
    latitude: form.get("latitude"),
    longitude: form.get("longitude"),
    scheduledAt: form.get("scheduledAt") ?? undefined,
    estimatedPrice: form.get("estimatedPrice") ?? undefined,
  })
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const data = parsed.data

  // 图片上传
  const files = form
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
  if (files.length > 6) {
    return apiError("INVALID_INPUT", "最多上传 6 张图片", 400)
  }
  const urls: string[] = []
  for (const f of files) {
    const res = await saveImage({
      file: f,
      subdir: `customer/${session.user.id}/orders`,
    })
    if (!res.ok) return apiError("INVALID_INPUT", res.error, 400)
    urls.push(res.url)
  }

  const order = await prisma.order.create({
    data: {
      customerId: session.user.id,
      serviceType: data.serviceType,
      title: data.title,
      description: data.description,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      scheduledAt: data.scheduledAt ?? undefined,
      estimatedPrice: data.estimatedPrice ?? undefined,
      images: urls,
      status: OrderStatus.PENDING,
      platformCommissionRate: COMMISSION_RATE,
    },
    select: { id: true, status: true },
  })

  return apiOk({ order }, 201)
}

/**
 * 列表:
 *   - scope=mine(默认):顾客看自己发的,电工看自己接的
 *   - scope=hall:电工抢单大厅 —— PENDING 且地址 ⊇ 我的服务区某一项
 */
export async function GET(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)

  const url = new URL(req.url)
  const parsed = orderListSchema.safeParse(
    Object.fromEntries(url.searchParams)
  )
  if (!parsed.success) {
    return apiError("INVALID_INPUT", parsed.error.issues[0].message, 400)
  }
  const q = parsed.data

  const statusFilter = q.status
    ? { in: q.status as OrderStatus[] }
    : undefined

  if (q.scope === "hall") {
    if (session.user.role !== "ELECTRICIAN") {
      return apiError("FORBIDDEN", "仅电工可访问大厅", 403)
    }
    // 必须已通过审核
    const me = await prisma.electricianProfile.findUnique({
      where: { userId: session.user.id },
      select: { verificationStatus: true, serviceAreas: true },
    })
    if (!me || me.verificationStatus !== VerificationStatus.APPROVED) {
      return apiError("FORBIDDEN", "需先通过资质审核", 403)
    }
    const areas = ((me.serviceAreas as string[]) ?? []).filter(Boolean)
    // 拿出所有 PENDING 订单,在 JS 里按"地址⊇某 serviceArea"过滤
    // (Postgres 没有简单的"any service area is substring of address"查询)
    const candidates = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        electricianId: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
      },
    })
    const filtered = candidates.filter((o) => {
      if (areas.length === 0) return true // 没填服务区的电工就全看
      const addr = o.address.toLowerCase()
      return areas.some((a) => {
        const lower = a.toLowerCase()
        return addr.includes(lower) || lower.includes(addr)
      })
    })
    const total = filtered.length
    const start = (q.page - 1) * q.limit
    const items = filtered.slice(start, start + q.limit)
    return apiOk({
      items: items.map(serializeOrderListItem),
      total,
      page: q.page,
      limit: q.limit,
    })
  }

  // scope=mine
  const where =
    session.user.role === "CUSTOMER"
      ? { customerId: session.user.id, ...(statusFilter ? { status: statusFilter } : {}) }
      : session.user.role === "ELECTRICIAN"
        ? { electricianId: session.user.id, ...(statusFilter ? { status: statusFilter } : {}) }
        : null
  if (!where) return apiError("FORBIDDEN", "无权访问", 403)

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        customer: { select: { id: true, name: true } },
        electrician: { select: { id: true, name: true } },
      },
    }),
  ])

  return apiOk({
    items: items.map(serializeOrderListItem),
    total,
    page: q.page,
    limit: q.limit,
  })
}

type OrderWithRelations = Awaited<
  ReturnType<typeof prisma.order.findFirst>
> & {
  customer?: { id: string; name: string } | null
  electrician?: { id: string; name: string } | null
}

function serializeOrderListItem(o: OrderWithRelations) {
  return {
    id: o!.id,
    customerId: o!.customerId,
    electricianId: o!.electricianId,
    customerName: o!.customer?.name ?? null,
    electricianName: o!.electrician?.name ?? null,
    serviceType: o!.serviceType,
    title: o!.title,
    description: o!.description,
    address: o!.address,
    latitude: o!.latitude,
    longitude: o!.longitude,
    images: (o!.images as string[]) ?? [],
    scheduledAt: o!.scheduledAt,
    estimatedPrice:
      o!.estimatedPrice !== null && o!.estimatedPrice !== undefined
        ? Number(o!.estimatedPrice)
        : null,
    status: o!.status,
    paymentStatus: o!.paymentStatus,
    createdAt: o!.createdAt,
    acceptedAt: o!.acceptedAt,
  }
}

export type OrderListItem = ReturnType<typeof serializeOrderListItem>
