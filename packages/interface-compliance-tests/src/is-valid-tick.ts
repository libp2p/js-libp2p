
/**
 * A tick is considered valid if it happened between now
 * and `ms` milliseconds ago
 */
export function isValidTick (date?: number, ms: number = 5000): boolean {
  if (date == null) {
    throw new Error('date must be a number')
  }

  const now = Date.now()

  if (date > now - ms && date <= now) {
    return true
  }

  return false
}
