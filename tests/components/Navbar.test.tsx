import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { signOut } from "firebase/auth"

// component imports
import Navbar from "@/components/Navbar"
import { auth } from "@/lib/firebase"
import { useUser } from "@/lib/user-context"

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}))

vi.mock("@/lib/user-context", () => ({
  useUser: vi.fn(),
}))

const mockedSignOut = vi.mocked(signOut)
const mockedUseUser = vi.mocked(useUser)

const fakeUser = {
  uid: "abc123",
  email: "a@b.com",
  displayName: "SilentVaultFalcon",
}

describe("Navbar", () => {
  beforeEach(() => {
    mockedSignOut.mockReset().mockResolvedValue(undefined)
    mockedUseUser.mockReset().mockReturnValue(fakeUser)
  })

  it("renders the main heading", () => {
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create Heist link", () => {
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })

  it("renders a logout button when the user is authenticated", () => {
    render(<Navbar />)

    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument()
  })

  it("does not render a logout button when the user is not authenticated", () => {
    mockedUseUser.mockReturnValue(null)
    render(<Navbar />)

    expect(
      screen.queryByRole("button", { name: /log out/i }),
    ).not.toBeInTheDocument()
  })

  it("calls Firebase signOut when the logout button is clicked", async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    await user.click(screen.getByRole("button", { name: /log out/i }))

    expect(mockedSignOut).toHaveBeenCalledWith(auth)
  })
})
