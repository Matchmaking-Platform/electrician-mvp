/**
 * i18n 入口(MVP:zh-CN 单语种)。
 *
 * 用法:
 *   import { t } from "@/i18n"
 *   t("order.status.PENDING")  // "待接单"
 *
 * 设计:点号路径访问深嵌套对象。找不到时返回 key 本身,便于调试。
 */
import { messages } from "./messages/zh-CN"

type AnyRecord = Record<string, unknown>

function lookup(path: string): string {
  const parts = path.split(".")
  let cur: unknown = messages
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as AnyRecord)) {
      cur = (cur as AnyRecord)[p]
    } else {
      return path
    }
  }
  return typeof cur === "string" ? cur : path
}

export const t = lookup
export { messages }
