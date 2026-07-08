"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
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

export default function AuthForm({ mode }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const emailId = useId()
  const passwordId = useId()
  const copy = COPY[mode]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    console.log({
      mode,
      email: formData.get("email"),
      password: formData.get("password"),
    })
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
        <button type="submit" className={styles.submit}>
          {copy.submitLabel}
        </button>
      </form>
      <p className={styles.switch}>
        {copy.switchPrompt}{" "}
        <Link href={copy.switchHref}>{copy.switchLinkText}</Link>
      </p>
    </>
  )
}
