"use client"

import Link from "next/link"
import { Button } from "@/components/ui"
import { useAuth } from "@/hooks"
import { usePathname } from "next/navigation"

export const Header = () => {
  const { handleLogout } = useAuth();
  const pathname = usePathname()
  const isAdminPath = pathname.startsWith("/admin/applications")

  return (
    <header className="w-full border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center">
          <img src="/logo.png" alt="EX BAGS" className="h-8 w-auto" />
        </Link>
        {isAdminPath && <div className="flex items-center justify-between gap-6">
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/applications"
              className="text-sm text-neutral-500 hover:text-black transition-colors"
            >
              Заявки
            </Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Выйти
          </Button>
        </div>}
      </div>
    </header>
  )
}