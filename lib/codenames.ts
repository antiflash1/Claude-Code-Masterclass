export const ADJECTIVES = [
  "Silent",
  "Shadow",
  "Crimson",
  "Velvet",
  "Rogue",
  "Phantom",
  "Golden",
  "Covert",
  "Midnight",
  "Slick",
] as const

export const HEIST_NOUNS = [
  "Vault",
  "Heist",
  "Caper",
  "Score",
  "Jackpot",
  "Ledger",
  "Getaway",
  "Blueprint",
  "Loot",
  "Stakeout",
] as const

export const ANIMAL_ALIASES = [
  "Falcon",
  "Fox",
  "Viper",
  "Raven",
  "Panther",
  "Cobra",
  "Wolf",
  "Hawk",
  "Jackal",
  "Lynx",
] as const

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function generateCodename(): string {
  return (
    pickRandom(ADJECTIVES) +
    pickRandom(HEIST_NOUNS) +
    pickRandom(ANIMAL_ALIASES)
  )
}
