import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// component imports
import PublicLayout from "@/app/(public)/layout"
import { useUser } from "@/lib/user-context"

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock("@/lib/user-context", () => ({
  useUser: vi.fn(),
}))

const mockedUseUser = vi.mocked(useUser)

const fakeUser = {
  uid: "abc123",
  email: "a@b.com",
  displayName: "SilentVaultFalcon",
}

describe("PublicLayout", () => {
  beforeEach(() => {
    routerPushMock.mockReset()
    mockedUseUser.mockReset()
  })

  it("renders a loader and does not redirect while auth state is resolving", () => {
    mockedUseUser.mockReturnValue(undefined)
    render(<PublicLayout>children</PublicLayout>)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("children")).not.toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("renders children and does not redirect when signed out", () => {
    mockedUseUser.mockReturnValue(null)
    render(<PublicLayout>children</PublicLayout>)

    expect(screen.getByText("children")).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it("redirects to /heists and does not render children when signed in", () => {
    mockedUseUser.mockReturnValue(fakeUser)
    render(<PublicLayout>children</PublicLayout>)

    expect(routerPushMock).toHaveBeenCalledWith("/heists")
    expect(screen.queryByText("children")).not.toBeInTheDocument()
  })
})
