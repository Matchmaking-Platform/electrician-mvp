import { Zap } from "lucide-react"
import Link from "next/link"

import { LogoutButton } from "@/components/shared/LogoutButton"
import { NotificationBell } from "@/components/shared/NotificationBell"
import { getSession } from "@/lib/auth"

const ROLE_HOME: Record<string, string> = {
  CUSTOMER: "/customer",
  ELECTRICIAN: "/electrician",
  ADMIN: "/admin",
}

export async function AppHeader() {
  const session = await getSession()

  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Zap className="size-5" />
          <span>电工平台</span>
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-4 text-sm sm:flex">
          <Link href="/electricians" className="hover:text-foreground">
            找电工
          </Link>
          {session?.user ? (
            <Link
              href={ROLE_HOME[session.user.role] ?? "/"}
              className="hover:text-foreground"
            >
              工作台
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <NotificationBell />
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {session.user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                登录
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
