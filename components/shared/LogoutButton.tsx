"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="退出登录"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="size-4" />
    </Button>
  )
}
