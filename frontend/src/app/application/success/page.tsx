import Link from "next/link"
import { Button } from "@/components/ui"

export default function SuccessPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center max-w-md mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium">Заявка принята!</h1>
        <p className="text-neutral-500 text-sm">
          Мы рассмотрим её и свяжемся с вами в ближайшее время по указанному телефону
        </p>
      </div>
      <Link href="/">
        <Button variant="secondary">На главную</Button>
      </Link>
    </div>
  )
}