import type { PeerId } from '@libp2p/interface'

/**
 * Count how many peers are in b but are not in a
 */
export function countDiffPeers (a: PeerId[], b: PeerId[]): number {
  const s = new Set()
  a.forEach((p) => s.add(p.toString()))

  return b.filter((p) => !s.has(p.toString())).length
}
