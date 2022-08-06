import { pair } from './pair.js'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export function duplexPair (): [Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>, Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>] {
  const a = pair()
  const b = pair()
  return [
    {
      source: a.source,
      sink: b.sink
    },
    {
      source: b.source,
      sink: a.sink
    }
  ]
}
