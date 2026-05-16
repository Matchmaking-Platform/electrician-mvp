"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  customerRegisterSchema,
  electricianRegisterSchema,
  type CustomerRegisterInput,
  type ElectricianRegisterInput,
} from "@/lib/validators/auth"

type Role = "customer" | "electrician"
type FormValues = CustomerRegisterInput | ElectricianRegisterInput

const schemaByRole = {
  customer: customerRegisterSchema,
  electrician: electricianRegisterSchema,
} as const

export function RegisterForm({ role }: { role: Role }) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(schemaByRole[role]),
    defaultValues: { email: "", password: "", name: "" },
  })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/auth/register/${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error?.message ?? "注册失败")
        return
      }
      toast.success("注册成功,自动登录中...")
      const login = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      })
      if (!login || login.error) {
        // 注册成功但登录失败时,跳到登录页
        router.replace("/login")
        return
      }
      router.replace("/")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormDescription>至少 8 位</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "提交中..." : "注册"}
        </Button>
      </form>
    </Form>
  )
}
