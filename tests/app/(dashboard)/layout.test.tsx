import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// component imports
import DashboardLayout from "@/app/(dashboard)/layout"
import { useUser } from "@/lib/user-context"

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock("@/lib/user-context", () => ({
  useUser: vi.fn(),
}))

vi.mock("@/components/Navbar", () => ({
  default: () => <div>Navbar</div>,
}))

const mockedUseUser = vi.mocked(useUser)

const fakeUser = {
  uid: "abc123",
  email: "a@b.com",
  displayName: "SilentVaultFalcon",
}

describe("DashboardLayout", () => {
  beforeEach(() => {
    routerPushMock.mockReset()
    mockedUseUser.mockReset()
  })

  it("renders a loader and no Navbar/children while auth state is resolving", () => {
    mockedUseUser.mockReturnValue(undefined)
    render(<DashboardLayout>children</DashboardLayout>)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("Navbar")).not.toBeInTheDocument()
    expect(screen.queryByText("children")).not.toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("renders Navbar and children and does not redirect when signed in", () => {
    mockedUseUser.mockReturnValue(fakeUser)
    render(<DashboardLayout>children</DashboardLayout>)

    expect(screen.getByText("Navbar")).toBeInTheDocument()
    expect(screen.getByText("children")).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("redirects to /login and does not render Navbar/children when signed out", () => {
    mockedUseUser.mockReturnValue(null)
    render(<DashboardLayout>children</DashboardLayout>)

    expect(routerPushMock).toHaveBeenCalledWith("/login")
    expect(screen.queryByText("Navbar")).not.toBeInTheDocument()
    expect(screen.queryByText("children")).not.toBeInTheDocument()
  })
})
