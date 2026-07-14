import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore"

// component imports
import HeistForm from "@/components/HeistForm"
import { useUser } from "@/lib/user-context"

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }))
const SERVER_TIMESTAMP_SENTINEL = { __sentinel: "serverTimestamp" }

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(),
}))

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}))

vi.mock("@/lib/user-context", () => ({
  useUser: vi.fn(),
}))

const mockedCollection = vi.mocked(collection)
const mockedAddDoc = vi.mocked(addDoc)
const mockedGetDocs = vi.mocked(getDocs)
const mockedServerTimestamp = vi.mocked(serverTimestamp)
const mockedUseUser = vi.mocked(useUser)

const currentUser = {
  uid: "me-1",
  email: "me@example.com",
  displayName: "MyCodename",
}

function fakeUsersSnapshot(
  users: { id: string; codename: string }[],
): Awaited<ReturnType<typeof getDocs>> {
  return {
    docs: users.map((u) => ({
      id: u.id,
      data: () => ({ codename: u.codename }),
    })),
  } as unknown as Awaited<ReturnType<typeof getDocs>>
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  assigneeName: string,
) {
  await user.type(screen.getByLabelText(/title/i), "Steal the stapler")
  await user.type(
    screen.getByLabelText(/description/i),
    "Recover it from the 3rd floor.",
  )
  await user.selectOptions(screen.getByLabelText(/assign to/i), assigneeName)
  await user.click(screen.getByRole("button", { name: /create heist/i }))
}

describe("HeistForm", () => {
  beforeEach(() => {
    routerPushMock.mockReset()
    mockedCollection
      .mockReset()
      .mockReturnValue({} as ReturnType<typeof collection>)
    mockedAddDoc
      .mockReset()
      .mockResolvedValue({} as Awaited<ReturnType<typeof addDoc>>)
    mockedGetDocs.mockReset().mockResolvedValue(
      fakeUsersSnapshot([
        { id: "me-1", codename: "MyCodename" },
        { id: "other-1", codename: "OtherCodename" },
      ]),
    )
    mockedServerTimestamp
      .mockReset()
      .mockReturnValue(
        SERVER_TIMESTAMP_SENTINEL as unknown as ReturnType<
          typeof serverTimestamp
        >,
      )
    mockedUseUser.mockReset().mockReturnValue(currentUser)
  })

  it("renders title, description, and assignee fields and a submit control", async () => {
    render(<HeistForm />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/assign to/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /create heist/i }),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )
  })

  it("excludes the current signed-in user from the assignee options", async () => {
    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )

    expect(
      screen.queryByRole("option", { name: "MyCodename" }),
    ).not.toBeInTheDocument()
  })

  it("blocks submission and shows a validation message when required fields are missing", async () => {
    const user = userEvent.setup()
    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )

    await user.click(screen.getByRole("button", { name: /create heist/i }))

    expect(mockedAddDoc).not.toHaveBeenCalled()
  })

  it("disables submission when no other agents are available to assign", async () => {
    mockedGetDocs.mockResolvedValue(
      fakeUsersSnapshot([{ id: "me-1", codename: "MyCodename" }]),
    )

    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByText(/no other agents available/i),
      ).toBeInTheDocument(),
    )

    expect(screen.getByRole("button", { name: /create heist/i })).toBeDisabled()
  })

  it("writes a Firestore heist doc with the expected fields and redirects on success", async () => {
    const user = userEvent.setup()
    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )

    const before = Date.now()
    await fillAndSubmit(user, "OtherCodename")

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith("/heists"))

    expect(mockedAddDoc).toHaveBeenCalledTimes(1)
    const [, input] = mockedAddDoc.mock.calls[0]
    expect(input).toMatchObject({
      title: "Steal the stapler",
      description: "Recover it from the 3rd floor.",
      createdBy: "me-1",
      createdByCodename: "MyCodename",
      assignedTo: "other-1",
      assignedToCodeName: "OtherCodename",
      createdAt: SERVER_TIMESTAMP_SENTINEL,
      finalStatus: null,
    })
    expect((input as { deadline: Date }).deadline).toBeInstanceOf(Date)
    const deadlineOffset =
      (input as { deadline: Date }).deadline.getTime() - before
    expect(deadlineOffset).toBeGreaterThan(47 * 60 * 60 * 1000)
    expect(deadlineOffset).toBeLessThan(49 * 60 * 60 * 1000)
  })

  it("shows an error and preserves entered values when the Firestore write fails", async () => {
    mockedAddDoc.mockRejectedValue(new Error("network error"))

    const user = userEvent.setup()
    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )

    await fillAndSubmit(user, "OtherCodename")

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(routerPushMock).not.toHaveBeenCalled()
    expect(screen.getByLabelText(/title/i)).toHaveValue("Steal the stapler")
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "Recover it from the 3rd floor.",
    )
  })

  it("disables the submit button while the write is pending", async () => {
    let resolveAddDoc: (
      value: Awaited<ReturnType<typeof addDoc>>,
    ) => void = () => {}
    mockedAddDoc.mockReturnValue(
      new Promise((resolve) => {
        resolveAddDoc = resolve
      }),
    )

    const user = userEvent.setup()
    render(<HeistForm />)

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: "OtherCodename" }),
      ).toBeInTheDocument(),
    )

    await fillAndSubmit(user, "OtherCodename")

    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled()

    resolveAddDoc({} as Awaited<ReturnType<typeof addDoc>>)

    await waitFor(() => expect(routerPushMock).toHaveBeenCalled())
  })
})
