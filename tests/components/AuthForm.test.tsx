import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  it("renders email and password fields and a Log In submit button in login mode", () => {
    render(<AuthForm mode="login" />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  it("renders email and password fields and a Sign Up submit button in signup mode", () => {
    render(<AuthForm mode="signup" />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument()
  })

  it("toggles the password field between masked and visible, updating accessible state", async () => {
    const user = userEvent.setup()
    render(<AuthForm mode="login" />)

    const passwordInput = screen.getByLabelText("Password")
    expect(passwordInput).toHaveAttribute("type", "password")

    const toggle = screen.getByRole("button", { name: /show password/i })
    expect(toggle).toHaveAttribute("aria-pressed", "false")

    await user.click(toggle)

    expect(passwordInput).toHaveAttribute("type", "text")
    expect(
      screen.getByRole("button", { name: /hide password/i }),
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("logs mode, email, and password on submit without a real form submission", async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm mode="signup" />)

    await user.type(screen.getByLabelText(/email/i), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.click(screen.getByRole("button", { name: /sign up/i }))

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "signup",
        email: "a@b.com",
        password: "secret123",
      }),
    )

    consoleSpy.mockRestore()
  })

  it("renders a switch link to /signup in login mode", () => {
    render(<AuthForm mode="login" />)

    const link = screen.getByRole("link", { name: /sign up/i })
    expect(link).toHaveAttribute("href", "/signup")
  })

  it("renders a switch link to /login in signup mode", () => {
    render(<AuthForm mode="signup" />)

    const link = screen.getByRole("link", { name: /log in/i })
    expect(link).toHaveAttribute("href", "/login")
  })
})
