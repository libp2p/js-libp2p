import type { PeerLoggerOptions } from './index.ts'
import type { PeerId } from '@libp2p/interface'

export function truncatePeerId (peerId: PeerId, options: PeerLoggerOptions = {}): string {
  const prefixLength = options.prefixLength ?? 2
  const suffixLength = options.suffixLength ?? 4

  const peerIdString = peerId.toString()
  return `${peerIdString.substring(0, prefixLength)}…${peerIdString.substring(peerIdString.length, peerIdString.length - suffixLength)}`
}
