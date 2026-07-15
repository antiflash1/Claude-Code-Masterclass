const MS_PER_MINUTE = 60 * 1000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

export function formatTimeRemaining(deadline: Date, now = new Date()): string {
  const remainingMs = deadline.getTime() - now.getTime()

  if (remainingMs <= 0) {
    return "Overdue"
  }

  if (remainingMs < MS_PER_DAY) {
    const hours = Math.floor(remainingMs / MS_PER_HOUR)
    const minutes = Math.floor((remainingMs % MS_PER_HOUR) / MS_PER_MINUTE)
    return `${hours}h ${minutes}m`
  }

  const days = Math.floor(remainingMs / MS_PER_DAY)
  const hours = Math.floor((remainingMs % MS_PER_DAY) / MS_PER_HOUR)
  return `${days}d ${hours}h`
}
