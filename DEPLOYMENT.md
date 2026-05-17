# 部署指南

把项目部署到 **Vercel(Next.js)+ Neon(PostgreSQL)+ Railway(Socket.io)** 的完整步骤。
全部用免费 / 低价档,~30 分钟搞定。

---

## 架构

```
┌─────────────────────┐         ┌──────────────────────┐
│   Vercel            │  HTTPS  │   Railway            │
│   Next.js (3000)    │ ←─────→ │   Socket.io (3001)   │
│   /api/* routes     │         │   /socket.io/* events│
└──────────┬──────────┘         └──────────┬───────────┘
           │                                │
           └──────────────┬─────────────────┘
                          │ DATABASE_URL
                          ▼
                ┌──────────────────┐
                │   Neon Postgres  │
                └──────────────────┘
```

为什么要把 Socket 单独部?Vercel 的 serverless 函数生命周期短,不能维持 WebSocket 长连接,所以必须放到能跑常驻进程的平台(Railway / Render / Fly.io / 自托 Node)。

---

## 1. 数据库:Neon

1. 去 https://neon.tech 注册并创建一个项目,选**离你最近的区域**。
2. 创建 Branch / Database(默认就行)。
3. 复制 **Pooled connection** 的 connection string,形如:
   ```
   postgresql://USER:PASS@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. **跑迁移到 Neon**:
   ```bash
   # 本地临时用 Neon 当 DB
   DATABASE_URL="<上面那串>" pnpm prisma migrate deploy
   # 可选:注入种子(只在测试期建议,正式上线前清掉)
   DATABASE_URL="<上面那串>" pnpm db:seed
   ```

> Neon 免费档够小规模 demo;有规模后买入门付费档(自动 pause + 冷启动毫秒级)。

---

## 2. Socket.io 服务:Railway

1. 注册 https://railway.app 并新建一个 Project → **Deploy from GitHub repo**。
2. 选我们的仓库。Railway 会问 root directory,填 `.`(项目根)。
3. 进入 Service Settings:
   - **Start command** 改为:
     ```
     pnpm install --frozen-lockfile && pnpm prisma generate && pnpm start:socket
     ```
     (Railway 会自动检测 pnpm,如果没识别,在 Settings → Custom Build Command 里加 `pnpm install`)
   - **Public Networking** → Generate Domain,得到 `https://<your-app>.up.railway.app`
4. **Environment Variables**(全部必填):
   ```
   DATABASE_URL=postgresql://...(同上 Neon)
   NEXTAUTH_SECRET=<和 Vercel 那边一定要一致>
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
   SOCKET_PORT=3001
   NODE_ENV=production
   ```
5. 部署完成后,浏览器开 `https://<your-app>.up.railway.app/` 应该回 `socket-ok`。

> 关键:`NEXTAUTH_SECRET` 必须和 Vercel 上的一致,否则 cookie 里的 JWT 解不开,socket 鉴权会失败。

---

## 3. Next.js:Vercel

1. 注册 https://vercel.com 并 Import 仓库。
2. Vercel 会自动识别 Next.js,框架预设保留默认即可。
3. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://...(同 Neon)
   NEXTAUTH_URL=https://<your-vercel-domain>.vercel.app
   NEXTAUTH_SECRET=<同 Railway>
   NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app
   NEXT_PUBLIC_SOCKET_URL=https://<your-railway-domain>.up.railway.app
   PLATFORM_COMMISSION_RATE=0
   MAX_UPLOAD_SIZE_MB=5
   UPLOAD_DIR=/tmp/uploads          # serverless 没持久磁盘,生产应该改 S3
   ```
4. Deploy。
5. 第一次部署成功后,**回到 Neon 把 `pnpm prisma migrate deploy` 在仓库里加成 build step**:
   - Vercel → Build & Development Settings → Build Command 改为:
     ```
     pnpm prisma generate && pnpm prisma migrate deploy && next build
     ```
   - 这样以后 push 新迁移就自动应用。

---

## 4. 验证全栈

1. 打开 `https://<your-vercel-domain>.vercel.app/login`
2. 用 seed 账号登录(`admin@example.com / password123`),应跳到管理后台 → 看板出图
3. 试一笔订单流:
   - 顾客下单 → 电工抢单 → 顾客支付 → 电工完工 → 顾客确认
   - 沿途铃铛通知应出现
4. **聊天 / 实时**:在订单详情页打开 DevTools → Network → WS,看是否连上 `wss://<your-railway-domain>`

如果聊天连不上,99% 是:
- `NEXT_PUBLIC_SOCKET_URL` 没设
- `NEXTAUTH_SECRET` 两边不一致
- 没把 Railway 的 CORS origin 加上 vercel 域名(代码里读 `NEXT_PUBLIC_APP_URL`,设对就行)

---

## 5. 生产必做的几件事

### 5.1 把 `public/uploads/` 换成 S3 / R2

```bash
pnpm add @aws-sdk/client-s3
```

改 `lib/uploads.ts` 的 `saveImage`:

```ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function saveImage({ file, subdir }) {
  const key = `${subdir}/${randomUUID()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }))
  return { ok: true, url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}` }
}
```

身份证 / 人脸照建议放**私有桶**,通过 `/api/private-uploads/[key]` 路由签名后返回,鉴权 + 时效控制。

### 5.2 速率限制换成 Upstash

```bash
pnpm add @upstash/ratelimit @upstash/redis
```

`lib/rate-limit.ts` 改成 Upstash 实现。

### 5.3 接真实 Stripe

参考 README "扩展指南" 一节。

### 5.4 接真实邮件 (Resend / Postmark)

`lib/mailer.ts` 替换实现。Vercel 加 `RESEND_API_KEY` env。

### 5.5 加 Sentry

```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

错误页 `app/error.tsx` 里的 `error.digest` 会自动关联 Sentry event id。

---

## 6. 监控 / 备份建议

- **Neon**:免费档自动每日快照保留 7 天;付费档可点对点恢复
- **Vercel**:自带 Analytics + Web Vitals
- **Railway**:Service Logs 可设保留 30 天;CPU/Mem 报警在 Settings → Metrics
- **业务**:加 Slack/邮件 webhook,在 `lib/audit-log.ts` 里关键动作时通知 ops

---

## 7. 域名 + HTTPS

- Vercel: Project → Domains → 加自有域名,自动签 Let's Encrypt
- Railway: 同上 + 把 CORS origin 设到自有域名
- 注意 `NEXTAUTH_URL` 必须和你的真实公开域名一致,否则登录跳转会卡

---

## 8. 故障排查 Cheatsheet

| 症状 | 大概率原因 |
|---|---|
| 登录后立刻被踢回登录页 | `NEXTAUTH_SECRET` 没设 / Vercel 和 Railway 不一致 |
| 聊天不连接 | `NEXT_PUBLIC_SOCKET_URL` 没设;Railway service 没 public domain |
| 上传文件 404 | serverless 没持久磁盘 → 必须换 S3 |
| Prisma timeout | Neon 自动 pause 后冷启动 ~3s,加重试或买付费档 |
| 抢单总是 409 | 两个 dev/prod 共用一份 db 时,容易看到对方刚抢的单 |
| `Decimal` 精度怪 | 把所有金额 Number(x) 转成 number 再展示;别直接 toString |

---

## 9. 一键回滚

- Vercel 自带 Deployments 列表,点旧的部署 → Promote to Production
- Railway 同理,Deployments → 点 ⋯ → Redeploy
- 数据库回滚:Neon 自带 branch / time travel,Settings → Branches → "Create branch at point in time"
