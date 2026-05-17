"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { ReviewCard, type ReviewItem } from "@/components/shared/ReviewCard"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Page = {
  items: ReviewItem[]
  total: number
  page: number
  limit: number
}

export function PublicReviewsTab({
  electricianProfileId,
}: {
  electricianProfileId: string
}) {
  const [page, setPage] = useState(1)
  const [minStars, setMinStars] = useState<string>("0")

  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", "10")
  if (minStars !== "0") params.set("minStars", minStars)

  const { data, isLoading } = useQuery<Page>({
    queryKey: ["electrician-reviews", electricianProfileId, page, minStars],
    queryFn: async () => {
      const res = await fetch(
        `/api/electricians/${electricianProfileId}/reviews?${params.toString()}`
      )
      if (!res.ok) throw new Error("load failed")
      return res.json()
    },
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {isLoading ? "加载中..." : `共 ${data?.total ?? 0} 条评价`}
        </p>
        <Select
          value={minStars}
          onValueChange={(v) => {
            if (v) {
              setPage(1)
              setMinStars(v)
            }
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">全部星级</SelectItem>
            <SelectItem value="5">5 星</SelectItem>
            <SelectItem value="4">≥ 4 星</SelectItem>
            <SelectItem value="3">≥ 3 星</SelectItem>
            <SelectItem value="2">≥ 2 星</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && data && data.items.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          没有匹配评价
        </p>
      ) : null}

      <div className="grid gap-2">
        {data?.items.map((r) => <ReviewCard key={r.id} item={r} />)}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </Button>
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  )
}
