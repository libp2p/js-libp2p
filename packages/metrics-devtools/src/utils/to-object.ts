export function toObject <T, R> (map: Map<string, T>, transform: (value: T) => R): Record<string, R> {
  const output: Record<string, any> = {}

  for (const [key, value] of map.entries()) {
    output[key] = transform(value)
  }

  return output
}
