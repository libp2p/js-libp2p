
interface Logger {
  (): void
  error: () => void
  trace: () => void
  enabled: boolean
}

export function logger (): Logger {
  const output = () => {}
  output.trace = () => {}
  output.error = () => {}
  output.enabled = false

  return output
}
