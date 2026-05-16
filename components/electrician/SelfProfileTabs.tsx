"use client"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { BasicInfoForm } from "./BasicInfoForm"
import { CasesManager, type CaseItem } from "./CasesManager"
import { PricesManager, type PriceItem } from "./PricesManager"

export type InitialSelfProfile = {
  bio: string
  yearsExperience: number
  baseHourlyRate: number
  serviceAreas: string[]
  isOnline: boolean
  cases: CaseItem[]
  prices: PriceItem[]
}

export function SelfProfileTabs({ initial }: { initial: InitialSelfProfile }) {
  return (
    <Tabs defaultValue="basic">
      <TabsList>
        <TabsTrigger value="basic">基本信息</TabsTrigger>
        <TabsTrigger value="cases">案例 ({initial.cases.length})</TabsTrigger>
        <TabsTrigger value="prices">报价 ({initial.prices.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="basic" className="mt-6">
        <BasicInfoForm
          initial={{
            bio: initial.bio,
            yearsExperience: initial.yearsExperience,
            baseHourlyRate: initial.baseHourlyRate,
            serviceAreas: initial.serviceAreas,
            isOnline: initial.isOnline,
          }}
        />
      </TabsContent>
      <TabsContent value="cases" className="mt-6">
        <CasesManager initial={initial.cases} />
      </TabsContent>
      <TabsContent value="prices" className="mt-6">
        <PricesManager initial={initial.prices} />
      </TabsContent>
    </Tabs>
  )
}
