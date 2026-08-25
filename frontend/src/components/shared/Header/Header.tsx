"use client"

import Link from "next/link"
import { useAuth } from "@/hooks"
import { usePathname } from "next/navigation"

export const Header = () => {
  const { handleLogout } = useAuth();
  const pathname = usePathname()
  const isAdminPath = pathname.startsWith("/admin/applications")

  return (
    <header className="w-full bg-black border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center">
          <img src="/logo.png" alt="EX BAGS" className="h-5 min-[450px]:h-8 w-auto invert" />
        </Link>
        {isAdminPath && <div className="flex items-center justify-between gap-6">
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/applications"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Заявки
            </Link>
          </nav>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Выйти
          </button>
        </div>}
      </div>
    </header>
  )
}
