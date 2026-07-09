import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { onAuthStateChanged } from "firebase/auth"

// component imports
import { UserProvider, useUser } from "@/lib/user-context"

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
}))

function Probe() {
  const user = useUser()
  return <div data-testid="user">{JSON.stringify(user)}</div>
}

const mockedOnAuthStateChanged = vi.mocked(onAuthStateChanged)

describe("useUser / UserProvider", () => {
  beforeEach(() => {
    mockedOnAuthStateChanged.mockReset()
  })

  it("returns undefined (loading) before the auth-state callback fires", () => {
    mockedOnAuthStateChanged.mockReturnValue(vi.fn())

    render(
      <UserProvider>
        <Probe />
      </UserProvider>,
    )

    expect(screen.getByTestId("user")).toHaveTextContent("")
  })

  it("returns null (signed out) after the callback fires with no user", () => {
    let callback: (user: unknown) => void = () => {}
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      callback = cb as (user: unknown) => void
      return vi.fn()
    })

    render(
      <UserProvider>
        <Probe />
      </UserProvider>,
    )

    act(() => {
      callback(null)
    })

    expect(screen.getByTestId("user")).toHaveTextContent("null")
  })

  it("returns the normalized user after the callback fires with a signed-in user", () => {
    let callback: (user: unknown) => void = () => {}
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      callback = cb as (user: unknown) => void
      return vi.fn()
    })

    render(
      <UserProvider>
        <Probe />
      </UserProvider>,
    )

    act(() => {
      callback({
        uid: "abc123",
        email: "a@b.com",
        displayName: "A B",
        extraFirebaseInternalStuff: "should be dropped",
      })
    })

    expect(screen.getByTestId("user")).toHaveTextContent(
      JSON.stringify({ uid: "abc123", email: "a@b.com", displayName: "A B" }),
    )
  })

  it("updates rendered value across signed-in -> signed-out -> signed-in transitions without remounting", () => {
    let callback: (user: unknown) => void = () => {}
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      callback = cb as (user: unknown) => void
      return vi.fn()
    })

    render(
      <UserProvider>
        <Probe />
      </UserProvider>,
    )

    act(() => {
      callback({ uid: "1", email: "one@b.com", displayName: null })
    })
    expect(screen.getByTestId("user")).toHaveTextContent(
      JSON.stringify({ uid: "1", email: "one@b.com", displayName: null }),
    )

    act(() => {
      callback(null)
    })
    expect(screen.getByTestId("user")).toHaveTextContent("null")

    act(() => {
      callback({ uid: "2", email: "two@b.com", displayName: null })
    })
    expect(screen.getByTestId("user")).toHaveTextContent(
      JSON.stringify({ uid: "2", email: "two@b.com", displayName: null }),
    )
  })

  it("uses exactly one onAuthStateChanged listener shared by multiple consumers", () => {
    let callback: (user: unknown) => void = () => {}
    mockedOnAuthStateChanged.mockImplementation((_auth, cb) => {
      callback = cb as (user: unknown) => void
      return vi.fn()
    })

    render(
      <UserProvider>
        <Probe />
        <Probe />
      </UserProvider>,
    )

    act(() => {
      callback({ uid: "1", email: "one@b.com", displayName: null })
    })

    const rendered = screen.getAllByTestId("user")
    expect(rendered).toHaveLength(2)
    rendered.forEach((el) =>
      expect(el).toHaveTextContent(
        JSON.stringify({ uid: "1", email: "one@b.com", displayName: null }),
      ),
    )
    expect(mockedOnAuthStateChanged).toHaveBeenCalledTimes(1)
  })

  it("throws when useUser is called without a UserProvider ancestor", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => render(<Probe />)).toThrow(
      "useUser must be used within a UserProvider",
    )

    consoleSpy.mockRestore()
  })
})
