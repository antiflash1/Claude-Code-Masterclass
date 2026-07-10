"use client"

import { useState } from "react"
import { Clock8, LogOut, Plus } from "lucide-react"
import Link from "next/link"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"
import Toast from "@/components/Toast"
import styles from "./Navbar.module.css"

function getSignOutErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "auth/network-request-failed"
  ) {
    return "Network error. Please check your connection and try again."
  }
  return "Something went wrong signing out. Please try again."
}

export default function Navbar() {
  const user = useUser()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleLogout() {
    if (isSigningOut) return

    setErrorMessage(null)
    setIsSigningOut(true)
    try {
      await signOut(auth)
    } catch (error) {
      setErrorMessage(getSignOutErrorMessage(error))
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          <h1>
            <Link href="/heists">
              P<Clock8 className={styles.logo} size={14} strokeWidth={2.75} />
              cket Heist
            </Link>
          </h1>
          <div>Tiny missions. Big office mischief.</div>
        </header>
        <ul>
          {user && (
            <li>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                aria-busy={isSigningOut}
                className="btn"
              >
                <LogOut size={20} strokeWidth={1.67} />
                Log Out
              </button>
            </li>
          )}
          <li>
            <Link href="/heists/create" className="btn">
              <Plus size={20} strokeWidth={1.67} />
              Create Heist
            </Link>
          </li>
        </ul>
      </nav>
      {errorMessage && <Toast message={errorMessage} />}
    </div>
  )
}
