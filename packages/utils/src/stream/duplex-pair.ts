import { pair } from './pair.js'
import type { Stream } from '@libp2p/interface/connection'

/**
 * Two duplex streams that are attached to each other
 */
export function duplexPair (): [Stream, Stream] {
  const a = pair()
  const b = pair()

  const aReadable = a.readable

  a.readable = b.readable
  b.readable = aReadable

  return [a, b]
}
