import { anySignal } from 'any-signal'
import { setMaxListeners } from 'main-event'
import type { AbortOptions } from '@libp2p/interface'
import type { ClearableSignal } from 'any-signal'

export function createTimeoutOptions (timeout: number): AbortOptions
export function createTimeoutOptions (timeout: number, ...existingSignals: AbortSignal[]): { signal: ClearableSignal }
export function createTimeoutOptions (timeout: number, ...existingSignals: AbortSignal[]): AbortOptions {
  let signal = AbortSignal.timeout(timeout)
  setMaxListeners(Infinity, signal)

  if (existingSignals.length > 0) {
    signal = anySignal([signal, ...existingSignals])
    setMaxListeners(Infinity, signal)
  }

  return {
    signal
  }
}
