import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

// component imports
import AuthForm from "@/components/AuthForm"
import { auth, db } from "@/lib/firebase"
import { generateCodename } from "@/lib/codenames"

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}))

vi.mock("@/lib/codenames", () => ({
  generateCodename: vi.fn(),
}))

const mockedCreateUser = vi.mocked(createUserWithEmailAndPassword)
const mockedUpdateProfile = vi.mocked(updateProfile)
const mockedDoc = vi.mocked(doc)
const mockedSetDoc = vi.mocked(setDoc)
const mockedGenerateCodename = vi.mocked(generateCodename)

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email/i), "a@b.com")
  await user.type(screen.getByLabelText("Password"), "secret123")
  await user.click(screen.getByRole("button", { name: /sign up/i }))
}

describe("AuthForm", () => {
  beforeEach(() => {
    routerPushMock.mockReset()
    mockedCreateUser.mockReset()
    mockedUpdateProfile.mockReset().mockResolvedValue(undefined)
    mockedDoc.mockReset().mockReturnValue({} as ReturnType<typeof doc>)
    mockedSetDoc.mockReset().mockResolvedValue(undefined)
    mockedGenerateCodename.mockReset().mockReturnValue("SilentVaultFalcon")
  })

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

  it("logs mode, email, and password on submit in login mode without a real form submission", async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText(/email/i), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "login",
        email: "a@b.com",
        password: "secret123",
      }),
    )

    consoleSpy.mockRestore()
  })

  it("does not call any Firebase or router APIs when submitting in login mode", async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<AuthForm mode="login" />)

    await user.type(screen.getByLabelText(/email/i), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.click(screen.getByRole("button", { name: /log in/i }))

    expect(mockedCreateUser).not.toHaveBeenCalled()
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
    expect(mockedSetDoc).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()

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

  it("creates a Firebase Auth user, sets a codename displayName, writes a Firestore doc, and redirects on successful signup", async () => {
    const fakeUser = { uid: "abc123" }
    mockedCreateUser.mockResolvedValue({
      user: fakeUser,
    } as unknown as Awaited<ReturnType<typeof createUserWithEmailAndPassword>>)
    const fakeDocRef = {} as ReturnType<typeof doc>
    mockedDoc.mockReturnValue(fakeDocRef)

    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)

    await fillAndSubmit(user)

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith("/heists")
    })

    expect(mockedCreateUser).toHaveBeenCalledWith(auth, "a@b.com", "secret123")
    expect(mockedUpdateProfile).toHaveBeenCalledWith(fakeUser, {
      displayName: "SilentVaultFalcon",
    })
    expect(mockedDoc).toHaveBeenCalledWith(db, "users", "abc123")
    expect(mockedSetDoc).toHaveBeenCalledWith(fakeDocRef, {
      codename: "SilentVaultFalcon",
    })
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows an inline error and skips Firestore when signup fails with an already-in-use email", async () => {
    mockedCreateUser.mockRejectedValue({ code: "auth/email-already-in-use" })

    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)

    await fillAndSubmit(user)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists.",
    )
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
    expect(mockedSetDoc).not.toHaveBeenCalled()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("shows an inline error and does not redirect when the Firestore write fails after signup succeeds", async () => {
    mockedCreateUser.mockResolvedValue({
      user: { uid: "abc123" },
    } as unknown as Awaited<ReturnType<typeof createUserWithEmailAndPassword>>)
    mockedSetDoc.mockRejectedValue(new Error("network error"))

    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)

    await fillAndSubmit(user)

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("disables the submit button while the signup request is pending", async () => {
    let resolveCreateUser: (
      value: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>,
    ) => void = () => {}
    mockedCreateUser.mockReturnValue(
      new Promise((resolve) => {
        resolveCreateUser = resolve
      }),
    )

    const user = userEvent.setup()
    render(<AuthForm mode="signup" />)

    await user.type(screen.getByLabelText(/email/i), "a@b.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    const submitButton = screen.getByRole("button", { name: /sign up/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()

    resolveCreateUser({
      user: { uid: "abc123" },
    } as unknown as Awaited<ReturnType<typeof createUserWithEmailAndPassword>>)

    await waitFor(() => expect(routerPushMock).toHaveBeenCalled())
  })
})
