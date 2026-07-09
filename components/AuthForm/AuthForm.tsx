"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { generateCodename } from "@/lib/codenames"
import styles from "./AuthForm.module.css"

export type AuthFormMode = "login" | "signup"

export type AuthFormProps = {
  mode: AuthFormMode
}

const COPY: Record<
  AuthFormMode,
  {
    heading: string
    submitLabel: string
    switchHref: string
    switchPrompt: string
    switchLinkText: string
  }
> = {
  login: {
    heading: "Log in to Your Account",
    submitLabel: "Log In",
    switchHref: "/signup",
    switchPrompt: "Need an account?",
    switchLinkText: "Sign up",
  },
  signup: {
    heading: "Sign Up for an Account",
    submitLabel: "Sign Up",
    switchHref: "/login",
    switchPrompt: "Already have an account?",
    switchLinkText: "Log in",
  },
}

function getSignupErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    switch (error.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists."
      case "auth/weak-password":
        return "Password is too weak. Please choose a stronger password."
      case "auth/invalid-email":
        return "Please enter a valid email address."
      case "auth/network-request-failed":
        return "Network error. Please check your connection and try again."
    }
  }

  return "Something went wrong. Please try again."
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()
  const router = useRouter()
  const copy = COPY[mode]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (mode === "login") {
      console.log({ mode, email, password })
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      )
      const codename = generateCodename()
      await updateProfile(user, { displayName: codename })
      await setDoc(doc(db, "users", user.uid), { codename })
      router.push("/heists")
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h1 className={`form-title ${styles.title}`}>{copy.heading}</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor={emailId} className={styles.label}>
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            required
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={passwordId} className={styles.label}>
            Password
          </label>
          <div className={styles.passwordRow}>
            <input
              id={passwordId}
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={styles.toggle}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className={styles.submit}>
          {copy.submitLabel}
        </button>
        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}
      </form>
      <p className={styles.switch}>
        {copy.switchPrompt}{" "}
        <Link href={copy.switchHref}>{copy.switchLinkText}</Link>
      </p>
    </>
  )
}
