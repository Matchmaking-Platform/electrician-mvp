"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type Point = {
  date: string
  newOrders: number
  newCustomers: number
  newElectricians: number
  gmv: number
}

export function DashboardCharts({ data }: { data: Point[] }) {
  // 简化日期标签:5/17
  const shaped = data.map((p) => ({
    ...p,
    label: p.date.slice(5).replace("-", "/"),
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">近 7 天订单 + 注册</CardTitle>
          <CardDescription>新订单 / 新顾客 / 新电工</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer>
              <LineChart data={shaped}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newOrders"
                  name="新订单"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="newCustomers"
                  name="新顾客"
                  stroke="#16a34a"
                />
                <Line
                  type="monotone"
                  dataKey="newElectricians"
                  name="新电工"
                  stroke="#f59e0b"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">近 7 天 GMV</CardTitle>
          <CardDescription>已完成 + 已结算订单的成交额(元)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer>
              <BarChart data={shaped}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gmv" name="GMV" fill="#0ea5e9" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
