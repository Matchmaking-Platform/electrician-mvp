/**
 * 独立 Socket.io 服务。
 * - 端口:SOCKET_PORT (默认 3001)
 * - 鉴权:读 NextAuth 的 session-token cookie,用 NEXTAUTH_SECRET 解 JWT
 * - 房间:order:{orderId},只允许订单关联的顾客或电工加入
 *
 * 启动:`pnpm dev:socket`(开发,带 hot reload)或 `pnpm start:socket`(生产)
 *
 * 注意:.env 必须包含 NEXTAUTH_SECRET 和 DATABASE_URL。
 * tsx 会通过 --env-file 加载;若手动跑用 node 21+ 也支持 --env-file。
 */

import { createServer } from "node:http"

import { PrismaClient } from "@prisma/client"
import { decode } from "next-auth/jwt"
import { Server } from "socket.io"

import { filterSensitive } from "../lib/sensitive-filter"
import type {
  ChatMessageDTO,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketAuthData,
} from "../lib/socket-events"

const PORT = Number(process.env.SOCKET_PORT ?? 3001)
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET
const CLIENT_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

if (!NEXTAUTH_SECRET) {
  console.error("[socket] NEXTAUTH_SECRET 未设置,无法验证 token")
  process.exit(1)
}

const prisma = new PrismaClient()

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" })
  res.end("socket-ok")
})

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketAuthData
>(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true,
  },
})

// 工具:解析 cookie 头
function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(";")) {
    const idx = part.indexOf("=")
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) {
      try {
        out[k] = decodeURIComponent(v)
      } catch {
        out[k] = v
      }
    }
  }
  return out
}

// 工具:从 cookie 取出 NextAuth JWT 并解码
async function authFromCookie(cookieHeader: string | undefined) {
  const cookies = parseCookies(cookieHeader)
  const tokenStr =
    cookies["next-auth.session-token"] ??
    cookies["__Secure-next-auth.session-token"]
  if (!tokenStr) return null
  try {
    const payload = await decode({
      token: tokenStr,
      secret: NEXTAUTH_SECRET!,
    })
    if (!payload?.id || !payload?.role || !payload?.name) return null
    return {
      userId: String(payload.id),
      userName: String(payload.name),
      role: payload.role as "CUSTOMER" | "ELECTRICIAN" | "ADMIN",
    }
  } catch (err) {
    console.warn("[socket] decode failed:", err)
    return null
  }
}

// 连接级鉴权
io.use(async (socket, next) => {
  const auth = await authFromCookie(socket.handshake.headers.cookie)
  if (!auth) return next(new Error("UNAUTHORIZED"))
  socket.data.userId = auth.userId
  socket.data.userName = auth.userName
  socket.data.role = auth.role
  next()
})

const ROOM_PREFIX = "order:"

/** 该 userId 是否允许进入这个订单的房间? */
async function canAccessOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, electricianId: true },
  })
  if (!order) return false
  return userId === order.customerId || userId === order.electricianId
}

/** 取订单的对方(用于离线通知) */
async function getCounterpart(orderId: string, meId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { customerId: true, electricianId: true },
  })
  if (!order) return null
  if (order.customerId === meId) return order.electricianId
  return order.customerId
}

io.on("connection", (socket) => {
  const { userId, userName } = socket.data
  console.log(`[socket] connected userId=${userId} sid=${socket.id}`)

  socket.on("join-room", async ({ orderId }, ack) => {
    if (!orderId) {
      ack?.({ ok: false, error: "缺少 orderId" })
      return
    }
    const ok = await canAccessOrder(userId, orderId)
    if (!ok) {
      ack?.({ ok: false, error: "无权访问此订单" })
      return
    }
    const room = ROOM_PREFIX + orderId
    // 1. 先告诉新加入者:房间里已有的对方在线
    const existing = await io.in(room).fetchSockets()
    const seenUsers = new Set<string>()
    for (const s of existing) {
      const other = s.data.userId
      if (other && other !== userId && !seenUsers.has(other)) {
        seenUsers.add(other)
        socket.emit("presence", { orderId, userId: other, online: true })
      }
    }
    // 2. 自己加入并广播给其他人
    socket.join(room)
    socket.to(room).emit("presence", { orderId, userId, online: true })
    ack?.({ ok: true })
  })

  socket.on("leave-room", ({ orderId }) => {
    const room = ROOM_PREFIX + orderId
    socket.leave(room)
    socket.to(room).emit("presence", { orderId, userId, online: false })
  })

  // 断线前(socket 还在房间里):广播下线
  socket.on("disconnecting", () => {
    for (const r of socket.rooms) {
      if (typeof r === "string" && r.startsWith(ROOM_PREFIX)) {
        const orderId = r.slice(ROOM_PREFIX.length)
        socket.to(r).emit("presence", { orderId, userId, online: false })
      }
    }
  })

  socket.on(
    "send-message",
    async ({ orderId, content, messageType, imageUrl }, ack) => {
      try {
        if (!orderId) {
          ack?.({ ok: false, error: "缺少 orderId" })
          return
        }
        const ok = await canAccessOrder(userId, orderId)
        if (!ok) {
          ack?.({ ok: false, error: "无权访问此订单" })
          return
        }

        let finalContent = String(content ?? "").trim()
        const type = messageType === "IMAGE" ? "IMAGE" : "TEXT"
        let finalImageUrl: string | null = null

        if (type === "TEXT") {
          if (!finalContent) {
            ack?.({ ok: false, error: "消息不能为空" })
            return
          }
          if (finalContent.length > 2000) {
            finalContent = finalContent.slice(0, 2000)
          }
          finalContent = filterSensitive(finalContent).safe
        } else {
          // 图片消息:URL 必须是平台上传路径
          if (typeof imageUrl !== "string" || !imageUrl.startsWith("/uploads/")) {
            ack?.({ ok: false, error: "图片地址无效" })
            return
          }
          finalImageUrl = imageUrl
          finalContent = "[图片]"
        }

        const persisted = await prisma.chatMessage.create({
          data: {
            orderId,
            senderId: userId,
            content: finalContent,
            messageType: type,
            imageUrl: finalImageUrl,
          },
          select: {
            id: true,
            orderId: true,
            senderId: true,
            content: true,
            messageType: true,
            imageUrl: true,
            createdAt: true,
          },
        })

        const dto: ChatMessageDTO = {
          id: persisted.id,
          orderId: persisted.orderId,
          senderId: persisted.senderId,
          senderName: userName,
          content: persisted.content,
          messageType: persisted.messageType,
          imageUrl: persisted.imageUrl,
          createdAt: persisted.createdAt.toISOString(),
        }

        const room = ROOM_PREFIX + orderId
        io.to(room).emit("message", dto)
        ack?.({ ok: true, message: dto })

        // 离线通知:对方不在房间则落 Notification
        const counterpartId = await getCounterpart(orderId, userId)
        if (counterpartId) {
          const sockets = await io.in(room).fetchSockets()
          const counterpartOnline = sockets.some(
            (s) => s.data.userId === counterpartId
          )
          if (!counterpartOnline) {
            await prisma.notification.create({
              data: {
                userId: counterpartId,
                type: "NEW_MESSAGE",
                title: `${userName} 给你发了一条消息`,
                body:
                  type === "IMAGE"
                    ? "[图片]"
                    : finalContent.length > 50
                      ? finalContent.slice(0, 50) + "..."
                      : finalContent,
                link: `/api/orders/${orderId}`,
              },
            })
          }
        }
      } catch (err) {
        console.error("[socket] send-message error:", err)
        ack?.({ ok: false, error: "服务器错误" })
      }
    }
  )

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected userId=${userId} sid=${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[socket] listening on :${PORT}, allow origin ${CLIENT_ORIGIN}`)
})

// 优雅退出
function shutdown() {
  console.log("[socket] shutting down...")
  io.close(() => {
    httpServer.close(() => {
      prisma.$disconnect().finally(() => process.exit(0))
    })
  })
}
process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
