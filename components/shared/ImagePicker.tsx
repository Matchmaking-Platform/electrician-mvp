"use client"

import { ImageIcon, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"

const ACCEPT = "image/jpeg,image/png,image/webp"
const MAX_BYTES = 5 * 1024 * 1024

type Props = {
  /** 当前选择的文件,或一个已存在的 URL(用于回填,如被驳回后再次编辑) */
  value: File | string | null
  onChange: (file: File | null) => void
  label: string
  hint?: string
  required?: boolean
  className?: string
  /** input 的 name 属性,方便表单/测试定位 */
  name?: string
}

export function ImagePicker({
  value,
  onChange,
  label,
  hint,
  required,
  className,
  name,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  // 把 File 转成 blob URL,在 value 变化或卸载时回收
  const previewUrl = useMemo(() => {
    if (!value) return null
    if (typeof value === "string") return value
    return URL.createObjectURL(value)
  }, [value])

  useEffect(() => {
    if (previewUrl && typeof value !== "string") {
      return () => URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, value])

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // 允许同名文件再次选择
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("请上传图片(JPG/PNG/WebP)")
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`文件超过 ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB`)
      return
    }
    setError(null)
    onChange(file)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setError(null)
  }

  const has = !!previewUrl

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label className="text-sm font-medium">
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-input bg-background hover:bg-muted/50 relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors",
          error ? "border-destructive" : ""
        )}
      >
        {has ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl!}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1 px-4 text-xs">
            <ImageIcon className="size-6" />
            <span>点击上传</span>
            {hint ? <span className="text-[10px]">{hint}</span> : null}
          </div>
        )}
        {has ? (
          <span
            onClick={handleClear}
            role="button"
            aria-label="清除"
            className="bg-background/90 absolute top-1 right-1 rounded-full p-1 shadow-sm"
          >
            <X className="size-3" />
          </span>
        ) : null}
      </button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  )
}
