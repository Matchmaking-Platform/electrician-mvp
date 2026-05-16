/**
 * 文件上传助手。
 *
 * MVP 实现:保存到 public/uploads/{subdir}/{uuid}.{ext},返回 URL 路径。
 *
 * 安全注意:
 * - public/uploads/ 下的文件会被 Next.js 当静态资源直接服务,任何持有 URL 的人都能访问。
 *   ID 卡、人脸照属于敏感图,生产环境应:
 *     a) 存到私有目录(非 public/),
 *     b) 用受鉴权的 GET /api/uploads/[id] 流式返回。
 *   MVP 阶段先用 public + UUID 不可预测路径过渡。
 * - 后续若改 S3,只要替换 saveFile 的实现即可。
 */
import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

export type SupportedMime = "image/jpeg" | "image/png" | "image/webp"

const ALLOWED_MIME: ReadonlySet<string> = new Set<SupportedMime>([
  "image/jpeg",
  "image/png",
  "image/webp",
])

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const MAX_UPLOAD_BYTES =
  (Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "5", 10) || 5) * 1024 * 1024

/** 校验后保存,返回可直接给 <img src> 用的 URL 路径(`/uploads/...`)。 */
export async function saveImage(opts: {
  /** FormData 拿到的 File 对象 */
  file: File
  /** 子目录(相对 public/uploads),例 "electrician/abc123" — 不要带前导 / */
  subdir: string
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!ALLOWED_MIME.has(opts.file.type)) {
    return { ok: false, error: "仅支持 JPG / PNG / WebP 格式" }
  }
  if (opts.file.size > MAX_UPLOAD_BYTES) {
    const mb = (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)
    return { ok: false, error: `文件超过 ${mb}MB 大小限制` }
  }

  // 规范化子目录,拒绝 ..、绝对路径等
  const safeSubdir = opts.subdir.replace(/[^a-zA-Z0-9_\-\/]/g, "")
  if (safeSubdir !== opts.subdir || safeSubdir.includes("..")) {
    return { ok: false, error: "非法的存储路径" }
  }

  const ext = EXT_BY_MIME[opts.file.type]
  const filename = `${randomUUID()}.${ext}`
  const publicRoot = path.resolve(process.cwd(), "public", "uploads")
  const dir = path.resolve(publicRoot, safeSubdir)

  // 保险:确保最终目录仍在 publicRoot 内(防 path traversal)
  if (!dir.startsWith(publicRoot + path.sep) && dir !== publicRoot) {
    return { ok: false, error: "非法的存储路径" }
  }

  await mkdir(dir, { recursive: true })
  const fullPath = path.join(dir, filename)
  const buffer = Buffer.from(await opts.file.arrayBuffer())
  await writeFile(fullPath, buffer)

  return { ok: true, url: `/uploads/${safeSubdir}/${filename}` }
}

/** 给测试/调试用:返回当前允许的 mime 列表 */
export const __allowedMimeForTests = () => Array.from(ALLOWED_MIME)
export const __maxBytesForTests = () => MAX_UPLOAD_BYTES
