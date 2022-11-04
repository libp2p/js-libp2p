
export const ONE_SECOND = 1000
export const ONE_MINUTE = 60 * ONE_SECOND

export function normaliseString (str: string): string {
  return str.replace(/-/g, '_')
}
