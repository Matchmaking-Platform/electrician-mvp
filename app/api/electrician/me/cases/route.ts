import { apiError, apiOk } from "@/lib/api"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveImage } from "@/lib/uploads"

/** 新增案例(multipart:title / description / images[]) */
export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user) return apiError("UNAUTHORIZED", "请先登录", 401)
  if (session.user.role !== "ELECTRICIAN") {
    return apiError("FORBIDDEN", "仅电工", 403)
  }
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!profile) return apiError("NOT_FOUND", "请先完成入驻", 404)

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return apiError("INVALID_INPUT", "请求格式错误", 400)
  }

  const title = String(form.get("title") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  if (!title) return apiError("INVALID_INPUT", "标题必填", 400)
  if (title.length > 100) return apiError("INVALID_INPUT", "标题最多 100 字", 400)
  if (description.length > 1000) {
    return apiError("INVALID_INPUT", "描述最多 1000 字", 400)
  }

  // 上传图片
  const files = form
    .getAll("images")
    .filter((v): v is File => v instanceof File && v.size > 0)
  if (files.length > 8) {
    return apiError("INVALID_INPUT", "单个案例最多 8 张图", 400)
  }
  const urls: string[] = []
  for (const f of files) {
    const res = await saveImage({
      file: f,
      subdir: `electrician/${session.user.id}/cases`,
    })
    if (!res.ok) return apiError("INVALID_INPUT", res.error, 400)
    urls.push(res.url)
  }

  const created = await prisma.portfolioCase.create({
    data: {
      electricianId: profile.id,
      title,
      description,
      images: urls,
    },
    select: { id: true, title: true, description: true, images: true },
  })

  return apiOk({ case: created }, 201)
}
