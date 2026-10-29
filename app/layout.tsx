import type React from "react"
import type { Metadata } from "next"
import { Archivo, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" })
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "600", "800"], variable: "--font-tamil", display: "swap" })
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600", "800"],
  variable: "--font-devanagari",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MigrantConnect",
  description: "Platform connecting migrant workers with employers"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} ${tamil.variable} ${devanagari.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
