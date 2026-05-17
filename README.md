# Electrician MVP

电工服务撮合平台 MVP。**三种角色**(顾客 / 电工 / 管理员),**双边市场**:顾客发布维修订单 → 电工抢单 → 平台托管付款 → 完工确认 → 评价 / 提现。

---

## 目录

- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [本地启动(完整步骤)](#本地启动完整步骤)
- [测试账号](#测试账号)
- [常用脚本](#常用脚本)
- [目录结构](#目录结构)
- [测试](#测试)
- [部署](#部署)
- [扩展指南](#扩展指南)
- [已知限制 / TODO](#已知限制--todo)

---

## 核心功能

| 模块 | 覆盖 |
|---|---|
| 鉴权 | 邮箱 + 密码注册 / 登录,NextAuth JWT,角色路由保护(`/customer/*` `/electrician/*` `/admin/*`)|
| 电工入驻 | 资质上传(身份证 / 人脸照 / 电工证)、管理员审核(通过 / 驳回 / 可重提)|
| 顾客浏览 | 公开 `/electricians` 列表(筛选 + 排序 + 分页 + 网格/列表切换)+ 详情(案例 / 报价 / 评价)|
| 下单 | 5 步表单,**Leaflet 地图点选位置**录经纬度,图片附件 |
| 派单 | "订单地址 ⊇ 电工服务区某一项"的子串匹配,在线优先 |
| 抢单 | 原子 `updateMany WHERE status=PENDING`,后到 409 |
| 实时聊天 | **独立 Socket.io 服务**(端口 3001),cookie 鉴权,房间 = orderId,文字 + 图片,在线指示 + 离线通知 |
| 敏感词 | 屏蔽手机 / QQ / 微信号关键字防跳单 |
| 支付托管 | **Mock 实现**(无需注册 Stripe),`STRIPE_SECRET_KEY` 留空走 mock;状态机 `UNPAID → HELD → RELEASED / REFUNDED` |
| 完工流程 | 电工上传凭证 → AWAITING_CONFIRMATION → 顾客确认 → 释放资金 + 电工余额累加 |
| 申诉 | 顾客发起 → DISPUTED → 管理员裁决放款 / 退款 |
| 评价 | 4 维星级(总体 / 专业 / 守时 / 性价比)+ 文字 + 图片,电工**一次性回复**;管理员可下架 |
| 提现 | 电工申请(余额预扣)→ 管理员标记打款 / 驳回(余额退回)|
| 通知 | 站内通知中心(铃铛 + 红点 + 下拉),**邮件副本**(MVP 控制台 mock)|
| 管理后台 | KPI 卡 + Recharts(7 天订单 / 注册 / GMV)+ 7 个功能入口 + 审计日志 |

抽成可配置:`PLATFORM_COMMISSION_RATE=0`(MVP 默认免费),改为 `0.15` 即生效,无需改代码。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 16 (App Router) + React 19 + TypeScript (strict) |
| 样式 | Tailwind CSS v4 + shadcn/ui (base-nova) |
| 数据库 | PostgreSQL 16(本地 Docker) |
| ORM | Prisma 6 |
| 鉴权 | NextAuth v4(Credentials Provider + JWT) |
| 实时通信 | **独立 Socket.io 服务**(Node 进程,与 Next 共存) |
| 支付 | Stripe Test Mode(已留接口,MVP 走 Mock) |
| 地图 | Leaflet + OpenStreetMap |
| 表单 / 校验 | React Hook Form + Zod 4 |
| 状态管理 | React Query(服务端)+ Zustand(局部) |
| 图表 | Recharts |
| 测试 | Vitest(单元)+ Playwright(E2E) |
| 包管理 | pnpm + concurrently |

---

## 本地启动(完整步骤)

### 0. 先装这三个工具(一次性)

| 工具 | 安装 | 用途 |
|---|---|---|
| Node 20+ | https://nodejs.org/(项目用 Node 24 验证) | 跑 Next.js / Socket / 测试 |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ | 起 Postgres |
| pnpm | `curl -fsSL https://get.pnpm.io/install.sh \| sh -` | 包管理 |

> 装好 pnpm 后,**新开终端**或 `source ~/.zshrc` 让 `pnpm` 命令可用。

### 1. 克隆 + 装依赖

```bash
git clone <仓库 URL> electrician-mvp
cd electrician-mvp
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# .env 里的默认值已经能直接跑(用 Docker Postgres + Mock 支付)
# 生产部署时按需改 DATABASE_URL / NEXTAUTH_SECRET / STRIPE_*
```

### 3. 启动数据库 + 跑迁移 + Seed

```bash
docker compose up -d db                  # 起 Postgres
docker compose ps                        # 应看到 STATUS = healthy

pnpm prisma migrate dev                  # 应用所有迁移
pnpm db:seed                             # 注入测试账号 + 数据
```

### 4. 启动开发服务器

```bash
pnpm dev
```

> 这条命令会用 `concurrently` 同时跑 **Next.js (3000)** + **Socket.io (3001)** 两个进程,彩色日志区分。

打开 [http://localhost:3000](http://localhost:3000) 开玩。

### 5. 停止 / 重启

```bash
# 停 dev server: 按 Ctrl+C
docker compose down                       # 停容器,数据保留
docker compose down -v                    # 数据也清掉(慎用)
```

---

## 测试账号

所有账号**密码一致:`password123`**。

| 角色 | 邮箱 | 备注 |
|---|---|---|
| 管理员 | `admin@example.com` | 看板 / 审核 / 裁决 / 提现 |
| 顾客 1 | `customer1@example.com` | 张顾客 |
| 顾客 2 | `customer2@example.com` | 李顾客 |
| 顾客 3 | `customer3@example.com` | 王顾客 |
| 电工 (APPROVED) | `electrician1@example.com` | 陈师傅 · 浦东 + 黄浦 · ¥150/h |
| 电工 (APPROVED) | `electrician2@example.com` | 刘师傅 · 徐汇 + 长宁 · ¥200/h |
| 电工 (APPROVED) | `electrician3@example.com` | 王师傅 · 虹口 · ¥100/h |
| 电工 (PENDING) | `electrician4@example.com` | 赵师傅 · 闵行 · 等待审核 |
| 电工 (REJECTED) | `electrician5@example.com` | 钱师傅 · 宝山 · 资料被驳回 |

---

## 常用脚本

```bash
# 开发
pnpm dev                    # Next + Socket 一起跑(推荐)
pnpm dev:next               # 只跑 Next.js
pnpm dev:socket             # 只跑 Socket.io 服务

# 数据库
pnpm db:migrate             # 跑迁移(交互式,有新表自动新建迁移)
pnpm db:seed                # 注入测试账号
pnpm db:reset               # 清库 + 重跑迁移 + seed
pnpm db:studio              # 打开 Prisma Studio,浏览器看表

# 构建 / 生产
pnpm build                  # next build
pnpm start                  # Next + Socket 生产模式一起跑

# 测试
pnpm test                   # Vitest 单元测试
pnpm test:watch             # Vitest watch 模式
pnpm test:e2e               # Playwright E2E

# 质量
pnpm lint                   # ESLint
pnpm exec tsc --noEmit      # TypeScript 类型检查
```

---

## 目录结构

```
electrician-mvp/
├── app/                          # Next.js App Router 入口
│   ├── (公开)
│   │   ├── page.tsx              # 首页
│   │   ├── login/                # 登录
│   │   ├── register/             # 顾客 / 电工注册
│   │   ├── electricians/         # 电工列表 + 详情(公开浏览)
│   │   ├── error.tsx             # 错误边界
│   │   └── not-found.tsx         # 404
│   ├── customer/                 # 顾客端(需登录)
│   │   ├── page.tsx              # 工作台
│   │   └── orders/               # 订单列表 / 新建 / 详情
│   ├── electrician/              # 电工端(需登录 + 审核通过)
│   │   ├── page.tsx              # 工作台
│   │   ├── onboarding/           # 资质上传 / 审核中 / 被驳回
│   │   ├── profile/              # 编辑公开主页 + 案例 + 报价
│   │   ├── orders/               # 接单大厅 + 我的订单
│   │   ├── reviews/              # 收到的评价 + 回复
│   │   └── wallet/               # 余额 + 提现 + 结算记录
│   ├── admin/                    # 管理后台(需 ADMIN 角色)
│   │   ├── page.tsx              # 数据看板(KPI + 7 天图表)
│   │   ├── electricians/         # 资质审核
│   │   ├── orders/               # 订单总览 + 详情
│   │   ├── disputes/             # 申诉列表
│   │   ├── reviews/              # 评价审核 / 下架
│   │   ├── users/                # 用户管理 / 封禁
│   │   ├── withdrawals/          # 提现审批
│   │   └── audit-log/            # 操作日志
│   └── api/                      # API 路由
│       ├── auth/                 # NextAuth + 注册
│       ├── orders/               # 订单 CRUD + grab/pay/complete/confirm/dispute/review/messages
│       ├── electricians/         # 公开列表 + 详情 + 评价
│       ├── electrician/me/       # 电工自助:profile / cases / prices / withdrawals
│       ├── admin/                # 管理员动作
│       └── notifications/        # 通知 list / read-all / read-one
├── server/
│   └── socket.ts                 # 独立 Socket.io 服务(端口 3001)
├── components/
│   ├── ui/                       # shadcn 原子组件
│   ├── shared/                   # 跨端复用(ChatPanel / OrderInfo / MapPicker / NotificationBell ...)
│   ├── customer/                 # 顾客特有(OrderCreateForm / ReviewDialog ...)
│   ├── electrician/              # 电工特有(SelfProfileTabs / OrderHall / WithdrawDialog ...)
│   └── admin/                    # 管理员特有(VerificationActions / ResolveDisputeActions ...)
├── lib/
│   ├── auth.ts                   # NextAuth 配置 + verifyCredentials
│   ├── prisma.ts                 # Prisma 单例
│   ├── socket-events.ts          # 共享 socket 事件类型
│   ├── sensitive-filter.ts       # 屏蔽手机 / 微信
│   ├── order-state.ts            # 状态机助手 + 抽成计算
│   ├── admin-stats.ts            # 看板数据聚合
│   ├── ratings.ts                # 电工评分重算
│   ├── notifications.ts          # 通知 + 邮件
│   ├── mailer.ts                 # 邮件 mock
│   ├── audit-log.ts              # 管理员动作日志
│   ├── uploads.ts                # 文件上传 + 路径穿越防护
│   ├── rate-limit.ts             # 内存版限流
│   ├── api.ts                    # apiOk / apiError 统一响应
│   ├── order-helpers.ts          # 状态 label + variant + timeAgo
│   ├── utils.ts                  # cn() 等
│   └── validators/               # Zod schemas(auth / order / review / withdrawal / electrician / payment)
├── prisma/
│   ├── schema.prisma             # 10 表 + 6 enum
│   ├── migrations/               # 迁移历史
│   └── seed.ts                   # 9 个测试账号
├── public/
│   └── uploads/                  # 用户上传文件(gitignored,内含 ID 卡等敏感图)
├── i18n/
│   ├── messages/zh-CN.ts         # 中文字典(迁移占位)
│   └── index.ts                  # t(path) 助手
├── tests/
│   ├── unit/                     # Vitest 单元测试(94 个)
│   └── e2e/                      # Playwright E2E(6 个)
├── types/
│   └── next-auth.d.ts            # 扩展 Session + JWT 类型
├── docker-compose.yml            # PostgreSQL 16
├── playwright.config.ts          # webServer 自动起 dev
├── vitest.config.ts
├── middleware.ts                 # 角色路由保护
├── package.json
└── .env / .env.example
```

---

## 测试

### 单元测试(Vitest,94 个)

- `validators-auth.test.ts` — 邮箱 / 密码 / role 守卫
- `validators-electrician.test.ts` — 入驻表单 / 自助 patch / 案例 / 报价
- `validators-order.test.ts` — 下单字段 / 列表查询
- `validators-payment.test.ts` — 支付金额 / 申诉 / 裁决(暗藏在 payment-flow E2E,无独立单测,见 lib/validators/payment.ts)
- `validators-review.test.ts` — 4 维星级 / 回复 / 下架
- `validators-withdrawal.test.ts` — 提现金额 / 银行信息
- `auth-verify-credentials.test.ts` — 登录鉴权(mock prisma)
- `rate-limit.test.ts` — 内存限流窗口
- `sensitive-filter.test.ts` — 手机 / 微信 / QQ 屏蔽
- `order-state.test.ts` — 状态机 + 抽成计算
- `i18n.test.ts` — 字典查找

### E2E 测试(Playwright,6 个,~30s 全套)

| 测试文件 | 覆盖 |
|---|---|
| `electrician-verification.spec.ts` | 注册 → 上传资质 → 管理员审核 → 电工登录工作台 |
| `order-flow.spec.ts` | 顾客 5 步表单(含地图点选)→ 电工抢单 → 双方看 ACCEPTED |
| `chat-flow.spec.ts` | 双 context 实时聊天 + 敏感词屏蔽 + presence |
| `payment-flow.spec.ts` | 付款 → 完工凭证 → 顾客确认 → 电工余额上涨 |
| `review-flow.spec.ts` | 评价对话框 → 公开列表展示 → 电工回复 |
| `admin-notification-flow.spec.ts` | 管理员审核 → 电工铃铛通知 |

跑测试:

```bash
pnpm test               # 单元
pnpm test:e2e           # E2E(自动起 dev server)
```

---

## 部署

完整步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。**简版**:

| 组件 | 推荐服务 | 备注 |
|---|---|---|
| Next.js | Vercel | 一键部署 |
| Socket.io | Railway / Render | 独立 Node 进程,跑 `pnpm start:socket` |
| PostgreSQL | Neon / Supabase | 把 connection URL 填到两边的 `DATABASE_URL` |
| 文件上传 | S3 / R2 | 改 `lib/uploads.ts` 的 `saveImage` |
| 邮件 | Resend / Postmark | 改 `lib/mailer.ts` 的 `sendEmail` |

---

## 扩展指南

### 接真实 Stripe 支付

打开 `app/api/orders/[id]/pay/route.ts`,把代码里 `if (stripeKey)` 那段注释展开:

```ts
import Stripe from "stripe"
const stripe = new Stripe(stripeKey)
const pi = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100),
  currency: "cny",
  metadata: { orderId: order.id },
})
return apiOk({ mode: "stripe", clientSecret: pi.client_secret })
```

再写一个 `app/api/stripe/webhook/route.ts` 处理 `payment_intent.succeeded` 事件(把 `paymentStatus` 置为 `HELD`)。

### 接真实邮件(Resend)

```bash
pnpm add resend
```

```ts
// lib/mailer.ts
import { Resend } from "resend"
const resend = new Resend(process.env.RESEND_API_KEY)
export async function sendEmail(p) {
  await resend.emails.send({
    from: "no-reply@yourdomain.com",
    to: p.to,
    subject: p.subject,
    text: p.text,
  })
  return { ok: true }
}
```

### 接真实短信

```ts
// lib/sms.ts(新建)
export async function sendSms({ phone, code }) {
  // 阿里云 / 腾讯云短信 SDK
}
```

在 `app/api/auth/send-code/route.ts`(新建)调用,把 `seed` 里 phone 字段也补上 UI。

### 加新品类(装修 / 水工)

`Order.serviceType` 是 string,无 enum 约束,直接扩展类型选项即可:

1. `lib/validators/order.ts` 里 `orderCreateFormSchema.serviceType` 加新枚举值
2. `components/customer/OrderCreateForm.tsx` 的 `SERVICE_TYPES` 加同名常量
3. 想做 worker 类型分流的话,加一个 `User.specialty` 字段(或新表)

### 启用抽成

`.env` 改 `PLATFORM_COMMISSION_RATE=0.15`,重启服务即可。已存在订单的抽成在创建时已快照,不受影响。

### 7 天自动确认完工

写一个 Vercel Cron / Railway Scheduled Task 每小时调一次:

```ts
// app/api/cron/auto-confirm/route.ts
const stale = await prisma.order.findMany({
  where: {
    status: "AWAITING_CONFIRMATION",
    completedAt: { lt: new Date(Date.now() - 7 * 86400_000) },
  },
})
for (const o of stale) {
  // 重用 /api/orders/[id]/confirm 的逻辑(抽出到 lib/orders.ts 复用)
}
```

---

## 已知限制 / TODO

- ⚠️ 文件上传存 `public/uploads/`(包括身份证、人脸照),URL 不可猜但仍是公开静态资源 → **生产改私有目录 + 签名 URL**(代码里已留 TODO)
- ⚠️ 速率限制是内存版,多进程 / serverless 部署需换 Upstash Ratelimit
- ⚠️ 派单的"区域匹配"是 substring,**真实场景用 PostGIS 距离查询**
- ⚠️ Next 16 已把 `middleware.ts` 重命名为 `proxy.ts`,目前仍 work 只是 deprecated 警告
- ⚠️ 7 天自动确认完工**未接 cron**(代码 TODO)
- ⚠️ Socket 在内存里管 presence,**多实例部署需 Redis Adapter**
- ⚠️ i18n 字典已写但组件未迁移文案

---

## License

MIT(示例)— 部署前自行确认。
