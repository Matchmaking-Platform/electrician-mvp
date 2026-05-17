/**
 * 邮件发送 mock。
 * MVP 阶段直接打印到控制台,生产环境替换为 nodemailer / Resend / Postmark。
 */

export type MailPayload = {
  to: string
  subject: string
  text: string
}

export async function sendEmail(p: MailPayload): Promise<{ ok: true; mock?: boolean }> {
  // 简单边界:邮箱不为空
  if (!p.to || !p.to.includes("@")) {
    console.warn("[mailer] skip: invalid recipient", p.to)
    return { ok: true }
  }
  console.log(
    `[mailer] (mock) → ${p.to}\n  subject: ${p.subject}\n  body: ${p.text}`
  )
  return { ok: true, mock: true }
}
