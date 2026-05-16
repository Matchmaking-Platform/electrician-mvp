import bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

// 必须在 import auth 之前 mock,否则 prisma 已被实例化
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import { verifyCredentials } from "@/lib/auth"

const findUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>

async function fakeUser(overrides: Partial<{
  email: string
  password: string
  role: "CUSTOMER" | "ELECTRICIAN" | "ADMIN"
  isBanned: boolean
  name: string
  avatarUrl: string | null
}> = {}) {
  const password = overrides.password ?? "password123"
  return {
    id: "user_1",
    email: overrides.email ?? "user@example.com",
    name: overrides.name ?? "测试用户",
    passwordHash: await bcrypt.hash(password, 4), // rounds=4 加速测试
    phone: null,
    role: overrides.role ?? "CUSTOMER",
    avatarUrl: overrides.avatarUrl ?? null,
    isBanned: overrides.isBanned ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

beforeEach(() => {
  findUnique.mockReset()
})

describe("verifyCredentials", () => {
  it("returns user shape on valid credentials", async () => {
    const u = await fakeUser({ email: "ok@example.com", password: "rightpass1" })
    findUnique.mockResolvedValueOnce(u)
    const result = await verifyCredentials({
      email: "ok@example.com",
      password: "rightpass1",
    })
    expect(result).toEqual({
      id: "user_1",
      email: "ok@example.com",
      name: "测试用户",
      role: "CUSTOMER",
      image: null,
    })
  })

  it("lowercases the email when looking up", async () => {
    const u = await fakeUser({ email: "mixedcase@example.com" })
    findUnique.mockResolvedValueOnce(u)
    await verifyCredentials({
      email: "MixedCase@Example.com",
      password: "password123",
    })
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "mixedcase@example.com" },
    })
  })

  it("returns null when password is wrong", async () => {
    const u = await fakeUser({ password: "correct1!" })
    findUnique.mockResolvedValueOnce(u)
    const result = await verifyCredentials({
      email: "user@example.com",
      password: "wrongpassword",
    })
    expect(result).toBeNull()
  })

  it("returns null when user does not exist", async () => {
    findUnique.mockResolvedValueOnce(null)
    const result = await verifyCredentials({
      email: "nobody@example.com",
      password: "password123",
    })
    expect(result).toBeNull()
  })

  it("returns null for banned users (even with correct password)", async () => {
    const u = await fakeUser({ password: "correct1!", isBanned: true })
    findUnique.mockResolvedValueOnce(u)
    const result = await verifyCredentials({
      email: "user@example.com",
      password: "correct1!",
    })
    expect(result).toBeNull()
  })

  it("returns null for malformed input (no DB hit)", async () => {
    const r1 = await verifyCredentials({ email: "not-an-email", password: "password123" })
    const r2 = await verifyCredentials({ email: "u@example.com", password: "abc" })
    const r3 = await verifyCredentials(null)
    expect(r1).toBeNull()
    expect(r2).toBeNull()
    expect(r3).toBeNull()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it("preserves role in the returned user object", async () => {
    const u = await fakeUser({ role: "ELECTRICIAN" })
    findUnique.mockResolvedValueOnce(u)
    const result = await verifyCredentials({
      email: "user@example.com",
      password: "password123",
    })
    expect(result?.role).toBe("ELECTRICIAN")
  })
})
