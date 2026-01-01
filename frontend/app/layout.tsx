import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"

export const metadata: Metadata = {
  title: "Architecture Journey - Navigate Technical Decisions",
  description: "Interactive decision trees to help you choose the right architecture, database, and technology stack for your project.",
  keywords: ["architecture", "decision tree", "database selection", "tech stack", "software architecture"],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

