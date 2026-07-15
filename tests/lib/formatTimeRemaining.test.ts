import { describe, it, expect } from "vitest"

// lib imports
import { formatTimeRemaining } from "@/lib/formatTimeRemaining"

describe("formatTimeRemaining", () => {
  const now = new Date("2026-01-01T12:00:00Z")

  it("returns 'Overdue' when the deadline is in the past", () => {
    const deadline = new Date(now.getTime() - 1000 * 60 * 60)
    expect(formatTimeRemaining(deadline, now)).toBe("Overdue")
  })

  it("returns 'Overdue' when the deadline is exactly now", () => {
    expect(formatTimeRemaining(new Date(now), now)).toBe("Overdue")
  })

  it("formats sub-day remaining time as 'Xh Ym'", () => {
    const deadline = new Date(
      now.getTime() + 4 * 60 * 60 * 1000 + 42 * 60 * 1000,
    )
    expect(formatTimeRemaining(deadline, now)).toBe("4h 42m")
  })

  it("formats multi-day remaining time as 'Xd Yh'", () => {
    const deadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    expect(formatTimeRemaining(deadline, now)).toBe("2d 0h")
  })
})
