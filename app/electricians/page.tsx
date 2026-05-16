import { Suspense } from "react"

import { ElectriciansBrowse } from "@/components/customer/ElectriciansBrowse"

export const dynamic = "force-dynamic"

export default function ElectriciansListPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">找电工</h1>
        <p className="text-muted-foreground text-sm">
          按区域、评分、价格筛选;在线师傅会优先排在前面。
        </p>
      </div>
      <Suspense>
        <ElectriciansBrowse />
      </Suspense>
    </main>
  )
}
