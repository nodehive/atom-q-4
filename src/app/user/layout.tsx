"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/user/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/user/header"
import { Loader2 } from "lucide-react"
import { UserRole } from "@prisma/client"

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session || session.user.role !== UserRole.USER) {
    router.push("/")
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full" key={pathname}>
        <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
        <SidebarInset className="flex-1">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}