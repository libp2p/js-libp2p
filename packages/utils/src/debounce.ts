import type { Startable } from '@libp2p/interface'

export interface DebouncedFunction extends Startable {
  (): void
}

/**
 * Returns a function wrapper that will only call the passed function once
 *
 * Important - the passed function should not throw or reject
 */
export function debounce (func: () => void | Promise<void>, wait: number): DebouncedFunction {
  let timeout: ReturnType<typeof setTimeout> | undefined

  const output = function (): void {
    const later = function (): void {
      timeout = undefined
      void func()
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
  output.start = (): void => {}
  output.stop = (): void => {
    clearTimeout(timeout)
  }

  return output
}
