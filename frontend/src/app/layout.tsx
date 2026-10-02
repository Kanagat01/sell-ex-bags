import type { Metadata } from "next"
import { Header } from "@/components/shared"
import { Footer } from "@/components/shared"
import "./globals.css"

export const metadata: Metadata = {
  title: "(ex)bags - ресейл платформа люксовых сумок и аксессуаров",
  description: "Выкуп, Trade-In и реализация дизайнерских сумок",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 w-full mx-auto">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}