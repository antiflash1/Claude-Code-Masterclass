import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import Avatar from "@/components/Avatar"

describe("Avatar", () => {
  it("renders the first letter of a plain name", () => {
    render(<Avatar name="mercury" />)

    expect(screen.getByText("M")).toBeInTheDocument()
  })

  it("renders the first two uppercase letters of a PascalCase name", () => {
    render(<Avatar name="JohnDoe" />)

    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("exposes the full name as an accessible label", () => {
    render(<Avatar name="JohnDoe" />)

    expect(screen.getByLabelText("JohnDoe")).toBeInTheDocument()
  })
})
