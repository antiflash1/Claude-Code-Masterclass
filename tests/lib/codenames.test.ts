import { describe, it, expect, vi, afterEach } from "vitest"

// lib imports
import {
  ADJECTIVES,
  HEIST_NOUNS,
  ANIMAL_ALIASES,
  generateCodename,
} from "@/lib/codenames"

describe("generateCodename", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("picks the first word of each list when Math.random always returns 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(generateCodename()).toBe(
      ADJECTIVES[0] + HEIST_NOUNS[0] + ANIMAL_ALIASES[0],
    )
  })

  it("picks the last word of each list when Math.random returns just under 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999)

    expect(generateCodename()).toBe(
      ADJECTIVES[ADJECTIVES.length - 1] +
        HEIST_NOUNS[HEIST_NOUNS.length - 1] +
        ANIMAL_ALIASES[ANIMAL_ALIASES.length - 1],
    )
  })

  it("returns a PascalCase string with no separators", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateCodename()).toMatch(/^[A-Z][a-zA-Z]*$/)
    }
  })

  it("produces more than one distinct value across many calls", () => {
    const results = new Set(
      Array.from({ length: 50 }, () => generateCodename()),
    )

    expect(results.size).toBeGreaterThan(1)
  })
})
