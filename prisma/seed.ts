/**
 * Database seed.
 * 运行:`pnpm db:seed`
 *
 * 注入:1 管理员 / 3 顾客 / 5 电工(含不同审核状态)。
 * 可重复执行(用 upsert,email 是唯一键)。
 */
import { PrismaClient, Role, VerificationStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
const SEED_PASSWORD = "password123"
const SALT_ROUNDS = 12

type SeedElectrician = {
  email: string
  name: string
  bio: string
  yearsExperience: number
  serviceAreas: string[]
  baseHourlyRate: number
  verificationStatus: VerificationStatus
  rejectReason?: string
  avgRating?: number
  ratingCount?: number
  totalOrders?: number
  completedOrders?: number
  cases?: { title: string; description: string; images: string[] }[]
  priceItems?: { serviceType: string; name: string; price: number; unit: string }[]
}

async function main() {
  console.log("🌱 Seeding database...")

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS)

  // ---------- 管理员 ----------
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      name: "平台管理员",
      role: Role.ADMIN,
    },
  })
  console.log(`  ✓ admin: ${admin.email}`)

  // ---------- 顾客 ----------
  const customers = [
    { email: "customer1@example.com", name: "张顾客" },
    { email: "customer2@example.com", name: "李顾客" },
    { email: "customer3@example.com", name: "王顾客" },
  ]
  for (const c of customers) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        passwordHash,
        name: c.name,
        role: Role.CUSTOMER,
      },
    })
    console.log(`  ✓ customer: ${u.email}`)
  }

  // ---------- 电工 ----------
  const electricians: SeedElectrician[] = [
    {
      email: "electrician1@example.com",
      name: "陈师傅",
      bio: "10 年家装电工经验,擅长强弱电改造、灯具安装。",
      yearsExperience: 10,
      serviceAreas: ["上海市浦东新区", "上海市黄浦区"],
      baseHourlyRate: 150,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.8,
      ratingCount: 23,
      totalOrders: 28,
      completedOrders: 25,
      cases: [
        {
          title: "三室两厅强电改造",
          description: "全屋电线更换为 4 平方铜芯,新增 6 个回路。",
          images: ["https://picsum.photos/seed/case-chen-1/600/400"],
        },
        {
          title: "客厅吊灯安装",
          description: "20kg 水晶吊灯吊装,膨胀螺栓加固。",
          images: ["https://picsum.photos/seed/case-chen-2/600/400"],
        },
      ],
      priceItems: [
        { serviceType: "维修", name: "线路故障检测", price: 100, unit: "次" },
        { serviceType: "安装", name: "插座/开关安装", price: 30, unit: "个" },
        { serviceType: "安装", name: "灯具安装", price: 80, unit: "项" },
      ],
    },
    {
      email: "electrician2@example.com",
      name: "刘师傅",
      bio: "持高级电工证,工业及商业电气维修。",
      yearsExperience: 15,
      serviceAreas: ["上海市徐汇区", "上海市长宁区"],
      baseHourlyRate: 200,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.9,
      ratingCount: 41,
      totalOrders: 45,
      completedOrders: 43,
      cases: [
        {
          title: "办公楼配电柜维护",
          description: "季度例检,断路器更换 6 个。",
          images: ["https://picsum.photos/seed/case-liu-1/600/400"],
        },
      ],
      priceItems: [
        { serviceType: "维修", name: "上门检测", price: 150, unit: "次" },
        { serviceType: "维修", name: "电箱整改", price: 500, unit: "项" },
      ],
    },
    {
      email: "electrician3@example.com",
      name: "王师傅",
      bio: "5 年家用电器维修经验,响应快。",
      yearsExperience: 5,
      serviceAreas: ["上海市虹口区"],
      baseHourlyRate: 100,
      verificationStatus: VerificationStatus.APPROVED,
      avgRating: 4.5,
      ratingCount: 12,
      totalOrders: 15,
      completedOrders: 13,
      priceItems: [
        { serviceType: "维修", name: "家电故障排查", price: 80, unit: "次" },
        { serviceType: "安装", name: "热水器安装", price: 200, unit: "项" },
      ],
    },
    {
      email: "electrician4@example.com",
      name: "赵师傅",
      bio: "刚提交资质,等待审核。",
      yearsExperience: 3,
      serviceAreas: ["上海市闵行区"],
      baseHourlyRate: 80,
      verificationStatus: VerificationStatus.PENDING,
    },
    {
      email: "electrician5@example.com",
      name: "钱师傅",
      bio: "资质材料模糊,被驳回示例。",
      yearsExperience: 2,
      serviceAreas: ["上海市宝山区"],
      baseHourlyRate: 70,
      verificationStatus: VerificationStatus.REJECTED,
      rejectReason: "电工证照片不清晰,请重新上传清晰版本。",
    },
  ]

  for (const e of electricians) {
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        passwordHash,
        name: e.name,
        role: Role.ELECTRICIAN,
      },
    })

    const profile = await prisma.electricianProfile.upsert({
      where: { userId: user.id },
      update: {
        bio: e.bio,
        yearsExperience: e.yearsExperience,
        serviceAreas: e.serviceAreas,
        baseHourlyRate: e.baseHourlyRate,
        verificationStatus: e.verificationStatus,
        rejectReason: e.rejectReason,
        avgRating: e.avgRating ?? 0,
        ratingCount: e.ratingCount ?? 0,
        totalOrders: e.totalOrders ?? 0,
        completedOrders: e.completedOrders ?? 0,
      },
      create: {
        userId: user.id,
        bio: e.bio,
        yearsExperience: e.yearsExperience,
        serviceAreas: e.serviceAreas,
        baseHourlyRate: e.baseHourlyRate,
        verificationStatus: e.verificationStatus,
        rejectReason: e.rejectReason,
        avgRating: e.avgRating ?? 0,
        ratingCount: e.ratingCount ?? 0,
        totalOrders: e.totalOrders ?? 0,
        completedOrders: e.completedOrders ?? 0,
      },
    })

    if (e.cases) {
      // 简单起见:删除已有 case 再插入,避免重复 seed
      await prisma.portfolioCase.deleteMany({ where: { electricianId: profile.id } })
      for (const c of e.cases) {
        await prisma.portfolioCase.create({
          data: {
            electricianId: profile.id,
            title: c.title,
            description: c.description,
            images: c.images,
          },
        })
      }
    }
    if (e.priceItems) {
      await prisma.priceItem.deleteMany({ where: { electricianId: profile.id } })
      for (const p of e.priceItems) {
        await prisma.priceItem.create({
          data: {
            electricianId: profile.id,
            serviceType: p.serviceType,
            name: p.name,
            price: p.price,
            unit: p.unit,
          },
        })
      }
    }

    console.log(`  ✓ electrician: ${user.email}  [${e.verificationStatus}]`)
  }

  console.log("✅ Seed complete.")
  console.log(`   测试账号统一密码:${SEED_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
