"use client"

import { format } from "date-fns"
import { ImageIcon, Send } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type {
  ChatMessageDTO,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/socket-events"

type Props = {
  orderId: string
  currentUserId: string
  /** 对方信息(仅用于标题展示;真实进出由 presence 事件决定) */
  counterpartName: string | null
  className?: string
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001"

export function ChatPanel({
  orderId,
  currentUserId,
  counterpartName,
  className,
}: Props) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [counterpartOnline, setCounterpartOnline] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 滚到底
  function scrollToBottom() {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages.length])

  // 拉历史
  useEffect(() => {
    let alive = true
    fetch(`/api/orders/${orderId}/messages?limit=100`)
      .then((r) => r.json())
      .then((data) => {
        if (alive && Array.isArray(data?.items)) setMessages(data.items)
      })
      .catch(() => {
        if (alive) toast.error("聊天记录加载失败")
      })
      .finally(() => {
        if (alive) setLoadingHistory(false)
      })
    return () => {
      alive = false
    }
  }, [orderId])

  // 连接 socket + 加入房间
  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      SOCKET_URL,
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
      }
    )
    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
      socket.emit("join-room", { orderId }, (res) => {
        if (!res.ok) {
          toast.error(`加入房间失败:${res.error}`)
        }
      })
    })
    socket.on("disconnect", () => {
      setConnected(false)
      setCounterpartOnline(false)
    })
    socket.on("connect_error", (err) => {
      console.warn("[chat] connect_error:", err.message)
    })
    socket.on("message", (msg) => {
      if (msg.orderId !== orderId) return
      setMessages((prev) => {
        // 去重(本端发送时已经先 push 了 dto)
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    socket.on("presence", (p) => {
      if (p.orderId !== orderId) return
      if (p.userId !== currentUserId) {
        setCounterpartOnline(p.online)
      }
    })

    return () => {
      socket.emit("leave-room", { orderId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [orderId, currentUserId])

  async function handleSend() {
    const content = text.trim()
    if (!content) return
    if (!socketRef.current || !connected) {
      toast.error("聊天未连接,请稍后再试")
      return
    }
    setSending(true)
    socketRef.current.emit(
      "send-message",
      { orderId, content, messageType: "TEXT" },
      (res) => {
        setSending(false)
        if (!res.ok) {
          toast.error(res.error)
          return
        }
        setText("")
        setMessages((prev) =>
          prev.some((m) => m.id === res.message.id)
            ? prev
            : [...prev, res.message]
        )
      }
    )
  }

  async function handleImagePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!f.type.startsWith("image/")) {
      toast.error("仅支持图片")
      return
    }
    if (!socketRef.current || !connected) {
      toast.error("聊天未连接")
      return
    }
    setSending(true)
    const fd = new FormData()
    fd.append("image", f)
    const res = await fetch(`/api/orders/${orderId}/messages/image`, {
      method: "POST",
      body: fd,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.url) {
      setSending(false)
      toast.error(data?.error?.message ?? "上传失败")
      return
    }
    socketRef.current.emit(
      "send-message",
      {
        orderId,
        content: "[图片]",
        messageType: "IMAGE",
        imageUrl: data.url,
      },
      (r) => {
        setSending(false)
        if (!r.ok) toast.error(r.error)
      }
    )
  }

  const grouped = useMemo(() => messages, [messages])

  return (
    <div
      className={cn(
        "bg-card flex flex-col rounded-lg border",
        className ?? "h-[500px]"
      )}
    >
      <div className="flex items-center justify-between border-b p-3 text-sm">
        <div>
          <p className="font-medium">
            与 {counterpartName ?? "对方"} 的聊天
          </p>
          <p className="text-muted-foreground text-xs">
            房间 = 订单,只有你和对方能看到
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              已连接
            </Badge>
          ) : (
            <Badge variant="outline">连接中</Badge>
          )}
          {counterpartOnline ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              对方在线
            </Badge>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="grow space-y-3 overflow-y-auto p-3 text-sm"
      >
        {loadingHistory ? (
          <p className="text-muted-foreground text-center text-xs">
            加载历史消息...
          </p>
        ) : grouped.length === 0 ? (
          <p className="text-muted-foreground text-center text-xs">
            还没有消息。聊聊上门时间、电梯/楼层等细节吧。
          </p>
        ) : (
          grouped.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              mine={m.senderId === currentUserId}
            />
          ))
        )}
      </div>

      <div className="flex items-end gap-2 border-t p-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="说点什么...(回车发送,Shift+回车换行)"
          rows={2}
          className="min-h-[44px] flex-1 resize-none"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImagePicked}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="发图片"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
        >
          <ImageIcon className="size-4" />
        </Button>
        <Button onClick={handleSend} disabled={sending || !text.trim()}>
          <Send className="size-4" />
          发送
        </Button>
      </div>
    </div>
  )
}

function Bubble({
  message,
  mine,
}: {
  message: ChatMessageDTO
  mine: boolean
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2",
          mine
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {!mine ? (
          <p className="text-muted-foreground mb-0.5 text-xs">
            {message.senderName}
          </p>
        ) : null}
        {message.messageType === "IMAGE" && message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt=""
            className="block max-h-48 max-w-full rounded-md"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            mine ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  )
}
