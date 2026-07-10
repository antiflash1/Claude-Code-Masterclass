"use client"

// components
import Loader from "@/components/Loader"

// hooks
import { useUser } from "@/lib/user-context"
import { useAuthRedirect } from "@/lib/useAuthRedirect"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = useUser()

  useAuthRedirect(!!user, "/heists")

  if (user === undefined) {
    return <Loader />
  }

  if (user) {
    return null
  }

  return <main className="public">{children}</main>
}
