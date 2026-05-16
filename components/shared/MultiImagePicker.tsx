"use client"

import { Plus, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const ACCEPT = "image/jpeg,image/png,image/webp"
const MAX_BYTES = 5 * 1024 * 1024

export type MultiItem = File | string // File 是新选,string 是已上传的 URL

type Props = {
  value: MultiItem[]
  onChange: (next: MultiItem[]) => void
  label: string
  max?: number
  required?: boolean
  className?: string
  /** input 的 name,方便测试定位 */
  name?: string
}

function Tile({
  item,
  onRemove,
}: {
  item: MultiItem
  onRemove: () => void
}) {
  const url = useMemo(() => {
    if (typeof item === "string") return item
    return URL.createObjectURL(item)
  }, [item])

  useEffect(() => {
    if (typeof item !== "string") {
      return () => URL.revokeObjectURL(url)
    }
  }, [url, item])

  return (
    <div className="border-input relative aspect-square overflow-hidden rounded-md border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="upload" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="移除"
        className="bg-background/90 absolute top-1 right-1 rounded-full p-1 shadow-sm"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

export function MultiImagePicker({
  value,
  onChange,
  label,
  max = 6,
  required,
  className,
  name,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const remaining = max - value.length

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!picked.length) return

    const accepted: File[] = []
    let err: string | null = null
    for (const f of picked) {
      if (accepted.length >= remaining) break
      if (!f.type.startsWith("image/")) {
        err = "仅支持图片格式"
        continue
      }
      if (f.size > MAX_BYTES) {
        err = `单张不超过 ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB`
        continue
      }
      accepted.push(f)
    }
    if (err) setError(err)
    else setError(null)
    if (accepted.length) onChange([...value, ...accepted])
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
        <span className="text-muted-foreground ml-2 text-xs font-normal">
          ({value.length}/{max})
        </span>
      </label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((item, i) => (
          <Tile
            key={i}
            item={item}
            onRemove={() => onChange(value.filter((_, j) => j !== i))}
          />
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-input bg-background hover:bg-muted/50 text-muted-foreground flex aspect-square items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="size-6" />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  )
}
