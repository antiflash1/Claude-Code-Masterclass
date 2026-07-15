import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

// component imports
import HeistsPage from "@/app/(dashboard)/heists/page"
import { useHeist, type HeistMode } from "@/lib/useHeist"
import type { Heist } from "@/types/firestore"

vi.mock("@/lib/useHeist", () => ({
  useHeist: vi.fn(),
}))

const mockedUseHeist = vi.mocked(useHeist)

function fakeHeist(id: string, title: string): Heist {
  return {
    id,
    title,
    description: "",
    createdBy: "u1",
    createdByCodename: "u1",
    assignedTo: "u2",
    assignedToCodeName: "u2",
    createdAt: new Date(),
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
    finalStatus: null,
  }
}

function mockHeistsByMode(
  byMode: Partial<Record<HeistMode, { heists: Heist[]; loading?: boolean }>>,
) {
  mockedUseHeist.mockImplementation((mode) => ({
    heists: byMode[mode]?.heists ?? [],
    loading: byMode[mode]?.loading ?? false,
  }))
}

describe("HeistsPage", () => {
  beforeEach(() => {
    mockedUseHeist.mockReset()
  })

  it("renders each hook's heists under its corresponding section", () => {
    mockHeistsByMode({
      active: { heists: [fakeHeist("a1", "Steal the stapler")] },
      assigned: { heists: [fakeHeist("s1", "Swap the mugs")] },
      expired: { heists: [fakeHeist("e1", "Hide the mascot")] },
    })

    render(<HeistsPage />)

    const activeSection = screen
      .getByRole("heading", { name: "Your Active Heists" })
      .closest("div") as HTMLElement
    const assignedSection = screen
      .getByRole("heading", { name: "Heists You've Assigned" })
      .closest("div") as HTMLElement
    const expiredSection = screen
      .getByRole("heading", { name: "All Expired Heists" })
      .closest("div") as HTMLElement

    expect(
      within(activeSection).getByRole("link", { name: "Steal the stapler" }),
    ).toBeInTheDocument()
    expect(
      within(assignedSection).getByRole("link", { name: "Swap the mugs" }),
    ).toBeInTheDocument()
    expect(
      within(expiredSection).getByText("Hide the mascot"),
    ).toBeInTheDocument()
  })

  it("renders each heading with no cards or list items when all result sets are empty", () => {
    mockHeistsByMode({
      active: { heists: [] },
      assigned: { heists: [] },
      expired: { heists: [] },
    })

    render(<HeistsPage />)

    expect(
      screen.getByRole("heading", { name: "Your Active Heists" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Heists You've Assigned" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "All Expired Heists" }),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })

  it("renders 3 skeleton cards per grid while loading, then swaps to real cards", () => {
    mockHeistsByMode({
      active: { heists: [], loading: true },
      assigned: { heists: [], loading: true },
      expired: { heists: [] },
    })

    const { rerender } = render(<HeistsPage />)

    expect(screen.getAllByTestId("heist-card-skeleton")).toHaveLength(6)
    expect(screen.queryAllByRole("link")).toHaveLength(0)

    mockHeistsByMode({
      active: { heists: [fakeHeist("a1", "Steal the stapler")] },
      assigned: { heists: [fakeHeist("s1", "Swap the mugs")] },
      expired: { heists: [] },
    })

    rerender(<HeistsPage />)

    expect(screen.queryAllByTestId("heist-card-skeleton")).toHaveLength(0)
    expect(
      screen.getByRole("link", { name: "Steal the stapler" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Swap the mugs" }),
    ).toBeInTheDocument()
  })
})
