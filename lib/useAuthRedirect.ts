"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function useAuthRedirect(shouldRedirect: boolean, to: string) {
  const router = useRouter()

  useEffect(() => {
    if (shouldRedirect) {
      router.push(to)
    }
  }, [shouldRedirect, to, router])
}
