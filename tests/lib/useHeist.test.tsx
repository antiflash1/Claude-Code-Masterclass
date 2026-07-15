import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  collection,
  onSnapshot,
  query,
  where,
  type QuerySnapshot,
} from "firebase/firestore"

// component imports
import { useHeist, type HeistMode } from "@/lib/useHeist"
import { useUser } from "@/lib/user-context"

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "heists-collection"),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => ["where", ...args]),
  onSnapshot: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  db: {},
}))

vi.mock("@/lib/user-context", () => ({
  useUser: vi.fn(),
}))

const mockedCollection = vi.mocked(collection)
const mockedQuery = vi.mocked(query)
const mockedWhere = vi.mocked(where)
const mockedOnSnapshot = vi.mocked(onSnapshot)
const mockedUseUser = vi.mocked(useUser)

const currentUser = {
  uid: "me-1",
  email: "me@example.com",
  displayName: "MyCodename",
}

function fakeHeistsSnapshot(
  heists: { id: string; title: string }[],
): QuerySnapshot {
  return {
    docs: heists.map((h) => ({
      id: h.id,
      data: () => ({ title: h.title }),
    })),
  } as unknown as QuerySnapshot
}

function Probe({ mode }: { mode: HeistMode }) {
  const { heists, loading } = useHeist(mode)
  return (
    <>
      <ul data-testid="heists">
        {heists.map((h) => (
          <li key={h.id}>{h.title}</li>
        ))}
      </ul>
      <div data-testid="loading">{String(loading)}</div>
    </>
  )
}

describe("useHeist", () => {
  const unsubscribeMock = vi.fn()

  beforeEach(() => {
    mockedCollection.mockClear()
    mockedQuery.mockClear()
    mockedWhere.mockClear()
    unsubscribeMock.mockClear()
    mockedOnSnapshot.mockReset().mockReturnValue(unsubscribeMock)
    mockedUseUser.mockReset().mockReturnValue(currentUser)
  })

  it("queries assignedTo + future deadline for 'active' mode", () => {
    render(<Probe mode="active" />)

    expect(mockedWhere).toHaveBeenCalledWith("assignedTo", "==", "me-1")
    expect(mockedWhere).toHaveBeenCalledWith("deadline", ">", expect.any(Date))
  })

  it("queries createdBy + future deadline for 'assigned' mode", () => {
    render(<Probe mode="assigned" />)

    expect(mockedWhere).toHaveBeenCalledWith("createdBy", "==", "me-1")
    expect(mockedWhere).toHaveBeenCalledWith("deadline", ">", expect.any(Date))
  })

  it("queries finalStatus in [success, failure] + past deadline for 'expired' mode, regardless of user", () => {
    mockedUseUser.mockReturnValue(undefined)
    render(<Probe mode="expired" />)

    expect(mockedWhere).toHaveBeenCalledWith("finalStatus", "in", [
      "success",
      "failure",
    ])
    expect(mockedWhere).toHaveBeenCalledWith("deadline", "<=", expect.any(Date))
    expect(mockedOnSnapshot).toHaveBeenCalledTimes(1)
  })

  it("does not subscribe for 'active' mode while auth state is still resolving", () => {
    mockedUseUser.mockReturnValue(undefined)
    render(<Probe mode="active" />)

    expect(mockedOnSnapshot).not.toHaveBeenCalled()
    expect(screen.getByTestId("heists")).toBeEmptyDOMElement()
  })

  it("does not subscribe for 'active' mode when signed out", () => {
    mockedUseUser.mockReturnValue(null)
    render(<Probe mode="active" />)

    expect(mockedOnSnapshot).not.toHaveBeenCalled()
    expect(screen.getByTestId("heists")).toBeEmptyDOMElement()
  })

  it("unsubscribes the old listener and subscribes a new one when mode changes", () => {
    const { rerender } = render(<Probe mode="active" />)
    expect(mockedOnSnapshot).toHaveBeenCalledTimes(1)

    rerender(<Probe mode="assigned" />)

    expect(unsubscribeMock).toHaveBeenCalledTimes(1)
    expect(mockedOnSnapshot).toHaveBeenCalledTimes(2)
  })

  it("updates the rendered list in place when a new snapshot is delivered", () => {
    let deliver: (snapshot: unknown) => void = () => {}
    mockedOnSnapshot.mockImplementation((_q, onNext) => {
      deliver = onNext as (snapshot: unknown) => void
      return unsubscribeMock
    })

    render(<Probe mode="active" />)

    act(() => {
      deliver(fakeHeistsSnapshot([{ id: "h1", title: "Steal the stapler" }]))
    })
    expect(screen.getByText("Steal the stapler")).toBeInTheDocument()

    act(() => {
      deliver(fakeHeistsSnapshot([{ id: "h2", title: "Swap the mugs" }]))
    })
    expect(screen.queryByText("Steal the stapler")).not.toBeInTheDocument()
    expect(screen.getByText("Swap the mugs")).toBeInTheDocument()
  })

  it("starts loading true and flips to false after the first snapshot", () => {
    let deliver: (snapshot: unknown) => void = () => {}
    mockedOnSnapshot.mockImplementation((_q, onNext) => {
      deliver = onNext as (snapshot: unknown) => void
      return unsubscribeMock
    })

    render(<Probe mode="active" />)

    expect(screen.getByTestId("loading")).toHaveTextContent("true")

    act(() => {
      deliver(fakeHeistsSnapshot([]))
    })

    expect(screen.getByTestId("loading")).toHaveTextContent("false")
  })

  it("flips loading to false when the snapshot listener errors", () => {
    let deliverError: (error: unknown) => void = () => {}
    mockedOnSnapshot.mockImplementation((_q, _onNext, onError) => {
      deliverError = onError as (error: unknown) => void
      return unsubscribeMock
    })

    render(<Probe mode="active" />)

    expect(screen.getByTestId("loading")).toHaveTextContent("true")

    act(() => {
      deliverError(new Error("boom"))
    })

    expect(screen.getByTestId("loading")).toHaveTextContent("false")
  })

  it("stays loading true while canQuery is false", () => {
    mockedUseUser.mockReturnValue(undefined)
    render(<Probe mode="active" />)

    expect(screen.getByTestId("loading")).toHaveTextContent("true")
  })
})
