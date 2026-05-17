/**
 * 客户端 + 服务端共享的 Socket.io 事件名 + payload 类型。
 *
 * 事件命名约定:
 *   - 客户端→服务端:动词形式(`join-room`, `send-message`)
 *   - 服务端→客户端:名词/事实形式(`message`, `joined`, `error`)
 */

export type ChatMessageType = "TEXT" | "IMAGE"

export type ChatMessageDTO = {
  id: string
  orderId: string
  senderId: string
  senderName: string
  content: string
  messageType: ChatMessageType
  imageUrl: string | null
  createdAt: string // ISO
}

// ---------------- 客户端 → 服务端 ----------------
export interface ClientToServerEvents {
  "join-room": (
    payload: { orderId: string },
    ack: (res: { ok: true } | { ok: false; error: string }) => void
  ) => void
  "send-message": (
    payload: {
      orderId: string
      content: string
      messageType: ChatMessageType
      imageUrl?: string | null
    },
    ack: (
      res: { ok: true; message: ChatMessageDTO } | { ok: false; error: string }
    ) => void
  ) => void
  "leave-room": (payload: { orderId: string }) => void
}

// ---------------- 服务端 → 客户端 ----------------
export interface ServerToClientEvents {
  message: (msg: ChatMessageDTO) => void
  /** 对方加入/离开房间(本端不收自己) */
  presence: (payload: { orderId: string; userId: string; online: boolean }) => void
}

export type SocketAuthData = {
  userId: string
  userName: string
  role: "CUSTOMER" | "ELECTRICIAN" | "ADMIN"
}
