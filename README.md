# Electrician MVP

电工服务撮合平台 MVP。顾客发单 → 电工抢单 → 完工付款 → 评价 的双边市场闭环。

> 当前进度:**阶段 0 — 项目脚手架已搭好**(Next.js + Tailwind + shadcn + Prisma 依赖 + Docker Postgres)。还没有任何业务代码。

## 技术栈

- **前端框架**:Next.js 16 (App Router) + React 19 + TypeScript
- **样式**:Tailwind CSS v4 + shadcn/ui(base-nova 风格)
- **数据库**:PostgreSQL 16(Docker 启动)+ Prisma ORM
- **鉴权**:NextAuth.js v4(Credentials + JWT)
- **实时通信**:Socket.io
- **支付**:Stripe(Test Mode)
- **地图**:Leaflet + OpenStreetMap
- **表单/校验**:React Hook Form + Zod
- **测试**:Vitest(单元)+ Playwright(E2E)
- **包管理器**:pnpm

## 本地运行

### 1. 安装前置依赖(只需一次)

- **Node.js 20+**(项目验证用 24.x)
- **Docker Desktop**(用来跑 PostgreSQL)
- **pnpm**:`curl -fsSL https://get.pnpm.io/install.sh | sh -`

### 2. 安装项目依赖

```bash
pnpm install
```

### 3. 启动数据库(后台运行)

```bash
docker compose up -d db
```

查看是否健康:

```bash
docker compose ps
# 应该看到 STATUS 显示 healthy
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 然后编辑 .env(本地默认值就能跑,后续阶段会用到 STRIPE_* 等)
```

> 项目中已经包含一个本地能直接用的 `.env`,只要 Docker 启动了 db 就行。

### 5. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 6. 停止数据库

```bash
docker compose down        # 停止容器,保留数据
docker compose down -v     # 停止容器并删除数据卷(慎用)
```

## 当前可用的脚本

```bash
pnpm dev        # 启动开发服务器(Turbopack)
pnpm build      # 生产构建
pnpm start      # 启动生产服务器
pnpm lint       # ESLint 检查
```

## 目录结构(阶段 0)

```
electrician-mvp/
├── app/                    # Next.js App Router 入口
│   ├── globals.css         # Tailwind v4 + shadcn 主题变量
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                 # shadcn 组件(13 个)
├── lib/
│   └── utils.ts            # cn() 等工具
├── public/
│   └── uploads/            # 用户上传文件(gitignored)
├── docker-compose.yml      # PostgreSQL 16
├── .env / .env.example     # 环境变量
└── components.json         # shadcn 配置
```

## 后续阶段路线图

- **阶段 1**:Prisma schema + NextAuth + 注册登录(顾客 / 电工分流)
- **阶段 2**:电工入驻 + 资质审核
- **阶段 3**:电工资料展示 + 列表筛选
- **阶段 4**:下单 + 抢单
- **阶段 5**:Socket.io IM 聊天
- **阶段 6**:Stripe 资金托管
- **阶段 7**:评价系统
- **阶段 8**:管理后台
- **阶段 9**:通知中心
- **阶段 10**:测试覆盖 + 部署文档
