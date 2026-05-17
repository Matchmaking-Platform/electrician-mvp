"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/order-helpers"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  isRead: boolean
  createdAt: string
}

type ApiResult = {
  items: NotificationItem[]
  unreadCount: number
}

export function NotificationBell() {
  const qc = useQueryClient()
  const { data } = useQuery<ApiResult>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=20", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("loading failed")
      return res.json()
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    // 401(未登录)拿不到数据时不要无限重试
    retry: false,
  })

  const markAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!res.ok) throw new Error("failed")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })

  // 未登录的访客 → 不显示铃铛
  if (!data) return null

  const unread = data.unreadCount

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="通知"
            className="relative"
          />
        }
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="bg-destructive text-destructive-foreground absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-[360px] p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">通知</span>
          {unread > 0 ? (
            <Button
              variant="link"
              size="sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              全部已读
            </Button>
          ) : null}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {data.items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              暂无通知
            </p>
          ) : (
            <ul>
              {data.items.map((n) => (
                <li key={n.id}>
                  <NotifRow
                    item={n}
                    onClick={() => {
                      if (!n.isRead) markOne.mutate(n.id)
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotifRow({
  item,
  onClick,
}: {
  item: NotificationItem
  onClick: () => void
}) {
  const content = (
    <div
      className={cn(
        "block px-3 py-2.5 text-sm",
        item.isRead ? "" : "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{item.title}</p>
        {!item.isRead ? (
          <Badge
            variant="secondary"
            className="h-4 shrink-0 px-1.5 text-[10px]"
          >
            新
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
        {item.body}
      </p>
      <p className="text-muted-foreground mt-1 text-[10px]">
        {timeAgo(item.createdAt)}
      </p>
    </div>
  )
  if (item.link) {
    return (
      <Link href={item.link} className="hover:bg-muted/40 block">
        {content}
      </Link>
    )
  }
  return <div className="hover:bg-muted/40">{content}</div>
}
