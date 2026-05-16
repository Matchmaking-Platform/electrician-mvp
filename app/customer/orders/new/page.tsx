import { OrderCreateForm } from "@/components/customer/OrderCreateForm"

export default function NewOrderPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">发布新订单</h1>
        <p className="text-muted-foreground text-sm">
          按步骤填写,我们会推送给附近的在线师傅。
        </p>
      </div>
      <OrderCreateForm />
    </main>
  )
}
