"use client"

// components
import Navbar from "@/components/Navbar"
import Loader from "@/components/Loader"

// hooks
import { useUser } from "@/lib/user-context"
import { useAuthRedirect } from "@/lib/useAuthRedirect"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = useUser()

  useAuthRedirect(user === null, "/login")

  if (user === undefined) {
    return <Loader />
  }

  if (user === null) {
    return null
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
