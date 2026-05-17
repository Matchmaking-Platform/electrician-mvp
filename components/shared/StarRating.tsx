"use client"

import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  value: number
  onChange?: (v: number) => void
  /** 只读模式(只展示) */
  readOnly?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "size-3",
  md: "size-5",
  lg: "size-7",
}

export function StarRating({
  value,
  onChange,
  readOnly,
  size = "md",
  className,
}: Props) {
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value
        const Wrapper = readOnly || !onChange ? "span" : "button"
        return (
          <Wrapper
            key={n}
            type={Wrapper === "button" ? "button" : undefined}
            onClick={readOnly || !onChange ? undefined : () => onChange(n)}
            className={cn(
              "transition-colors",
              !readOnly && onChange ? "hover:scale-110 cursor-pointer" : ""
            )}
            aria-label={`${n} 星`}
          >
            <Star
              className={cn(
                SIZE[size],
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              )}
            />
          </Wrapper>
        )
      })}
    </div>
  )
}
