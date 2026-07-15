import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import HeistCard from "@/components/HeistCard"
import type { Heist } from "@/types/firestore"

function fakeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "h1",
    title: "Steal the stapler",
    description: "",
    createdBy: "u1",
    createdByCodename: "ShadowLedgerFox",
    assignedTo: "u2",
    assignedToCodeName: "VelvetVaultRaven",
    createdAt: new Date(),
    deadline: new Date("2026-01-03T12:00:00Z"),
    finalStatus: null,
    ...overrides,
  }
}

describe("HeistCard", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the title as a link to /heists/:id", () => {
    render(<HeistCard heist={fakeHeist()} />)

    const link = screen.getByRole("link", { name: "Steal the stapler" })
    expect(link).toHaveAttribute("href", "/heists/h1")
  })

  it("renders the assigned-to and assigned-by codenames", () => {
    render(<HeistCard heist={fakeHeist()} />)

    expect(screen.getByText("VelvetVaultRaven")).toBeInTheDocument()
    expect(screen.getByText("ShadowLedgerFox")).toBeInTheDocument()
  })

  it("renders the deadline and time-remaining text", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"))

    render(<HeistCard heist={fakeHeist()} />)

    expect(screen.getByText(/2d 0h/)).toBeInTheDocument()
  })

  it("renders 'Overdue' when the deadline has passed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-05T12:00:00Z"))

    render(<HeistCard heist={fakeHeist()} />)

    expect(screen.getByText(/Overdue/)).toBeInTheDocument()
  })
})
