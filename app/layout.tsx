import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { AppHeader } from "@/components/shared/AppHeader"
import { Providers } from "@/components/shared/providers"
import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "电工服务撮合平台",
  description: "顾客发单,电工接单,完工评价,资金托管。",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers>
          <AppHeader />
          <div className="flex-1">{children}</div>
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  )
}
