import type { PeerId } from '@libp2p/interfaces/peer-id'
import { base58btc } from 'multiformats/bases/base58'

/**
 * Count how many peers are in b but are not in a
 */
export function countDiffPeers (a: PeerId[], b: PeerId[]) {
  const s = new Set()
  a.forEach((p) => s.add(p.toString(base58btc)))

  return b.filter((p) => !s.has(p.toString(base58btc))).length
}
