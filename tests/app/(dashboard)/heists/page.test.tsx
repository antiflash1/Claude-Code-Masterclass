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
    deadline: new Date(),
    finalStatus: null,
  }
}

function mockHeistsByMode(byMode: Partial<Record<HeistMode, Heist[]>>) {
  mockedUseHeist.mockImplementation((mode) => byMode[mode] ?? [])
}

describe("HeistsPage", () => {
  beforeEach(() => {
    mockedUseHeist.mockReset()
  })

  it("renders each hook's titles under its corresponding section", () => {
    mockHeistsByMode({
      active: [fakeHeist("a1", "Steal the stapler")],
      assigned: [fakeHeist("s1", "Swap the mugs")],
      expired: [fakeHeist("e1", "Hide the mascot")],
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
      within(activeSection).getByText("Steal the stapler"),
    ).toBeInTheDocument()
    expect(
      within(assignedSection).getByText("Swap the mugs"),
    ).toBeInTheDocument()
    expect(
      within(expiredSection).getByText("Hide the mascot"),
    ).toBeInTheDocument()
  })

  it("renders each heading with no list items when all result sets are empty", () => {
    mockHeistsByMode({ active: [], assigned: [], expired: [] })

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
  })
})
