/**
 * 敏感词 / 防跳单过滤。
 * MVP 实现:替换手机号、QQ、微信号关键字。后期可换专业库。
 */

const PHONE_RE = /(?:\+?86[-\s]?)?1[3-9]\d{9}|(?:\d{3,4}[-\s]?)?\d{7,8}/g
const QQ_RE = /\b[Qq]{2}[ ]?[:号][ ]?\d{5,12}\b|\b[Qq]{2}\d{5,12}\b/g
// 微信号:字母开头,6-20 位字母数字下划线/中划线;或显式提及"加微"
const WECHAT_RE =
  /(?:微信|wechat|加微|VX|vx|v信|V信)[ :号]?[A-Za-z][A-Za-z0-9_-]{5,19}/g
const KEYWORD_RE =
  /(?:加我微信|加微信|私聊微信|私下联系|微信好友|留个手机|私下交易|绕过平台)/g

const REPLACEMENT = "[屏蔽]"

export type FilterResult = {
  safe: string
  redacted: boolean
}

export function filterSensitive(input: string): FilterResult {
  let out = input
  let redacted = false

  const before = out
  out = out
    .replace(PHONE_RE, REPLACEMENT)
    .replace(QQ_RE, REPLACEMENT)
    .replace(WECHAT_RE, REPLACEMENT)
    .replace(KEYWORD_RE, REPLACEMENT)
  if (out !== before) redacted = true

  return { safe: out, redacted }
}
