import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import HeistCardSkeleton from "@/components/HeistCardSkeleton"

describe("HeistCardSkeleton", () => {
  it("renders as an aria-hidden placeholder", () => {
    render(<HeistCardSkeleton />)

    const skeleton = screen.getByTestId("heist-card-skeleton")
    expect(skeleton).toHaveAttribute("aria-hidden", "true")
  })
})
