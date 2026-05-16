"use client"

import { useQuery } from "@tanstack/react-query"
import { Grid3x3, List, Star } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import type { ElectricianListItem } from "@/app/api/electricians/route"

type ApiResult = {
  items: ElectricianListItem[]
  total: number
  page: number
  limit: number
}

const SORT_LABEL: Record<string, string> = {
  comprehensive: "综合",
  rating: "评分高到低",
  priceAsc: "价格低到高",
  priceDesc: "价格高到低",
}

function buildSearchParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams()
  if (state.q) p.set("q", state.q)
  if (state.area) p.set("area", state.area)
  if (state.minRating) p.set("minRating", String(state.minRating))
  if (state.minPrice) p.set("minPrice", String(state.minPrice))
  if (state.maxPrice) p.set("maxPrice", String(state.maxPrice))
  if (state.online) p.set("online", "true")
  if (state.sort && state.sort !== "comprehensive") p.set("sort", state.sort)
  if (state.page > 1) p.set("page", String(state.page))
  return p
}

type FilterState = {
  q: string
  area: string
  minRating: string
  minPrice: string
  maxPrice: string
  online: boolean
  sort: string
  page: number
}

function parseStateFromUrl(searchParams: URLSearchParams): FilterState {
  return {
    q: searchParams.get("q") ?? "",
    area: searchParams.get("area") ?? "",
    minRating: searchParams.get("minRating") ?? "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    online: searchParams.get("online") === "true",
    sort: searchParams.get("sort") ?? "comprehensive",
    page: Math.max(1, Number(searchParams.get("page") ?? "1") || 1),
  }
}

export function ElectriciansBrowse() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialState = useMemo(
    () => parseStateFromUrl(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )
  const [filters, setFilters] = useState<FilterState>(initialState)
  const [view, setView] = useState<"grid" | "list">("grid")

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    const next = { ...filters, [key]: value, page: key === "page" ? Number(value) : 1 }
    setFilters(next)
    const sp = buildSearchParams(next)
    router.replace(`/electricians${sp.toString() ? `?${sp}` : ""}`, {
      scroll: false,
    })
  }

  const queryString = useMemo(
    () => buildSearchParams({ ...filters, page: filters.page }).toString(),
    [filters]
  )

  const { data, isLoading, isError } = useQuery<ApiResult>({
    queryKey: ["electricians", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/electricians?${queryString}`)
      if (!res.ok) throw new Error("加载失败")
      return res.json()
    },
  })

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      {/* 筛选侧栏 */}
      <aside className="grid h-fit gap-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="font-medium">筛选</span>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="f-q">关键词</Label>
              <Input
                id="f-q"
                placeholder="姓名 / 简介"
                value={filters.q}
                onChange={(e) => update("q", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-area">服务区域</Label>
              <Input
                id="f-area"
                placeholder="例:浦东"
                value={filters.area}
                onChange={(e) => update("area", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="f-rating">最低评分</Label>
              <Input
                id="f-rating"
                type="number"
                min={0}
                max={5}
                step="0.5"
                placeholder="0 - 5"
                value={filters.minRating}
                onChange={(e) => update("minRating", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="f-min">最低价</Label>
                <Input
                  id="f-min"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => update("minPrice", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="f-max">最高价</Label>
                <Input
                  id="f-max"
                  type="number"
                  min={0}
                  placeholder="∞"
                  value={filters.maxPrice}
                  onChange={(e) => update("maxPrice", e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="f-online">只看在线</Label>
              <Switch
                id="f-online"
                checked={filters.online}
                onCheckedChange={(c) => update("online", c)}
              />
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* 主列表 */}
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-muted-foreground text-sm">
            {data ? `共 ${data.total} 位师傅` : "加载中..."}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={filters.sort}
              onValueChange={(v) => v && update("sort", v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="icon-sm"
              onClick={() => setView("grid")}
              aria-label="网格"
            >
              <Grid3x3 className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="icon-sm"
              onClick={() => setView("list")}
              aria-label="列表"
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {isError ? (
          <p className="text-destructive text-sm">加载失败,请稍后再试。</p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">加载中...</p>
        ) : data && data.items.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            没有匹配的师傅,试试调整筛选条件。
          </p>
        ) : data ? (
          <>
            {view === "grid" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((it) => (
                  <ElectricianCardGrid key={it.id} item={it} />
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                {data.items.map((it) => (
                  <ElectricianCardList key={it.id} item={it} />
                ))}
              </div>
            )}

            {/* 分页 */}
            <Pagination
              page={filters.page}
              total={data.total}
              limit={data.limit}
              onChange={(p) => update("page", p)}
            />
          </>
        ) : null}
      </section>
    </div>
  )
}

function RatingPill({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
      <Star className="size-3 fill-amber-400 text-amber-400" />
      {rating > 0 ? rating.toFixed(1) : "新"}
      <span className="ml-0.5">({count})</span>
    </span>
  )
}

function ElectricianCardGrid({ item }: { item: ElectricianListItem }) {
  return (
    <Link href={`/electricians/${item.id}`}>
      <Card className="hover:bg-muted/40 transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-medium">{item.name}</p>
              <p className="text-muted-foreground text-xs">
                从业 {item.yearsExperience} 年
              </p>
            </div>
            {item.isOnline ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                在线
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <RatingPill rating={item.avgRating} count={item.ratingCount} />
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {item.bio ?? "—"}
          </p>
          <p className="text-sm">
            参考时薪 <span className="font-medium">¥{item.baseHourlyRate}</span>{" "}
            / 小时
          </p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            服务区:{item.serviceAreas.join("、") || "—"}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function ElectricianCardList({ item }: { item: ElectricianListItem }) {
  return (
    <Link href={`/electricians/${item.id}`}>
      <Card className="hover:bg-muted/40 transition-colors">
        <CardContent className="flex items-center gap-4 py-3">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            {item.name.slice(0, 1)}
          </div>
          <div className="grid flex-1 gap-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.name}</p>
              {item.isOnline ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  在线
                </Badge>
              ) : null}
              <RatingPill rating={item.avgRating} count={item.ratingCount} />
            </div>
            <p className="text-muted-foreground line-clamp-1 text-xs">
              {item.bio ?? "—"}
            </p>
            <p className="text-muted-foreground text-xs">
              服务区:{item.serviceAreas.join("、") || "—"} · 从业{" "}
              {item.yearsExperience} 年
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">¥{item.baseHourlyRate}</p>
            <p className="text-muted-foreground text-xs">/ 小时</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function Pagination({
  page,
  total,
  limit,
  onChange,
}: {
  page: number
  total: number
  limit: number
  onChange: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (totalPages <= 1) return null
  return (
    <div className="text-muted-foreground flex items-center justify-between text-sm">
      <p>
        第 {page} / {totalPages} 页
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
