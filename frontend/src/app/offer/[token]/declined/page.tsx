import Link from "next/link"
import { Button } from "@/components/ui"

export default function DeclinedPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 px-6 text-center max-w-md mx-auto">
      <span className="text-5xl">👋</span>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Вы отказались от предложения</h1>
        <p className="text-neutral-500 text-sm">
          Спасибо за обращение. Если передумаете — свяжитесь с нами напрямую
        </p>
      </div>
      <Link href="/">
        <Button variant="secondary">На главную</Button>
      </Link>
    </div>
  )
}