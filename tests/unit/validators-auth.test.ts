import { describe, expect, it } from "vitest"

import {
  customerRegisterSchema,
  electricianRegisterSchema,
  isRole,
  loginSchema,
} from "@/lib/validators/auth"

describe("loginSchema", () => {
  it("accepts valid email + password", () => {
    const r = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    })
    expect(r.success).toBe(true)
  })

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    })
    expect(r.success).toBe(false)
  })

  it("rejects short password (<8)", () => {
    const r = loginSchema.safeParse({
      email: "user@example.com",
      password: "abc",
    })
    expect(r.success).toBe(false)
  })

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false)
    expect(
      loginSchema.safeParse({ email: "u@example.com" }).success
    ).toBe(false)
  })
})

describe("customerRegisterSchema", () => {
  it("requires name", () => {
    const r = customerRegisterSchema.safeParse({
      email: "u@example.com",
      password: "password123",
      name: "",
    })
    expect(r.success).toBe(false)
  })

  it("accepts full payload", () => {
    const r = customerRegisterSchema.safeParse({
      email: "u@example.com",
      password: "password123",
      name: "张三",
    })
    expect(r.success).toBe(true)
  })

  it("caps password at 72 chars (bcrypt limit)", () => {
    const r = customerRegisterSchema.safeParse({
      email: "u@example.com",
      password: "a".repeat(73),
      name: "X",
    })
    expect(r.success).toBe(false)
  })
})

describe("electricianRegisterSchema", () => {
  it("validates same fields as customer", () => {
    const r = electricianRegisterSchema.safeParse({
      email: "e@example.com",
      password: "password123",
      name: "陈师傅",
    })
    expect(r.success).toBe(true)
  })
})

describe("isRole", () => {
  it("recognizes valid roles", () => {
    expect(isRole("CUSTOMER")).toBe(true)
    expect(isRole("ELECTRICIAN")).toBe(true)
    expect(isRole("ADMIN")).toBe(true)
  })

  it("rejects invalid values", () => {
    expect(isRole("admin")).toBe(false) // case-sensitive
    expect(isRole("user")).toBe(false)
    expect(isRole(null)).toBe(false)
    expect(isRole(undefined)).toBe(false)
    expect(isRole(42)).toBe(false)
  })
})
