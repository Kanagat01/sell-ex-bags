"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"

export default function AdminIndexPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    router.replace(isAuthenticated ? "/admin/applications" : "/admin/login")
  }, [isAuthenticated, router])

  return null
}
