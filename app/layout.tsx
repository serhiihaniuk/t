import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeSyncScript } from "@/components/theme-sync-script"
import { cn } from "@/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Transactions Dashboard",
  description:
    "A mock streaming-service dashboard for payment history, invoice downloads, and bulk failed-payment retries.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeCookie = getThemeCookie((await headers()).get("cookie"))
  const initialThemeClass = themeCookie === "dark" ? "dark" : undefined
  const colorScheme =
    themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        initialThemeClass,
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
      style={colorScheme ? { colorScheme } : undefined}
    >
      <head>
        <ThemeSyncScript />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}

function getThemeCookie(cookieHeader: string | null): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("transactions-dashboard-theme="))
    ?.split("=")[1]
}
