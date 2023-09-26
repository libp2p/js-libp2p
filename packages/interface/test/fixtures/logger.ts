interface Logger {
  (): void
  error: () => void
  trace: () => void
  enabled: boolean
}

export function logger (): Logger {
  const output = (): void => {}
  output.trace = (): void => {}
  output.error = (): void => {}
  output.enabled = false

  return output
}
