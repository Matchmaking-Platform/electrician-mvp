import { StarRating } from "@/components/shared/StarRating"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/order-helpers"

export type ReviewItem = {
  id: string
  customerName?: string | null
  rating: number
  professionalismRating?: number
  punctualityRating?: number
  valueRating?: number
  comment: string | null
  images: string[]
  electricianReply: string | null
  repliedAt: Date | string | null
  isHidden?: boolean
  hiddenReason?: string | null
  createdAt: Date | string
}

export function ReviewCard({
  item,
  showHidden,
  className,
}: {
  item: ReviewItem
  /** 管理员/电工本人视图:即使下架也显示,带提示;否则隐藏的条目不应出现在此组件 */
  showHidden?: boolean
  className?: string
}) {
  const isHidden = item.isHidden === true
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        isHidden ? "bg-muted/30 opacity-70" : "",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.customerName ?? "顾客"}</span>
            <StarRating value={item.rating} readOnly size="sm" />
          </div>
          <p className="text-muted-foreground text-xs">
            {timeAgo(item.createdAt)}
          </p>
        </div>
        {showHidden && isHidden ? (
          <span className="text-destructive text-xs">已下架</span>
        ) : null}
      </div>

      {item.professionalismRating !== undefined ? (
        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>专业 {item.professionalismRating}</span>
          <span>守时 {item.punctualityRating}</span>
          <span>性价比 {item.valueRating}</span>
        </div>
      ) : null}

      {item.comment ? (
        <p className="mt-3 text-sm whitespace-pre-wrap">{item.comment}</p>
      ) : null}

      {item.images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {item.images.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={u}
              alt={`评价图 ${i + 1}`}
              className="aspect-square w-full rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}

      {item.electricianReply ? (
        <div className="bg-muted/40 mt-3 rounded-md p-3 text-sm">
          <p className="text-muted-foreground text-xs">
            师傅回复{" "}
            {item.repliedAt ? `· ${timeAgo(item.repliedAt)}` : null}
          </p>
          <p className="mt-1 whitespace-pre-wrap">{item.electricianReply}</p>
        </div>
      ) : null}

      {showHidden && isHidden && item.hiddenReason ? (
        <p className="text-destructive mt-3 text-xs">
          下架理由:{item.hiddenReason}
        </p>
      ) : null}
    </div>
  )
}
