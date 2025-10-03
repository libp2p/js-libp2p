import { streamPair } from '@libp2p/utils'
import { stubInterface } from 'sinon-ts'
import type { Connection, PeerId } from '@libp2p/interface'

/**
 * Returns two connections:
 *
 * 1. peerA -> peerB
 * 2. peerB -> peerA
 */
export const connectionPair = async (peerA: PeerId, peerB: PeerId): Promise<[Connection, Connection]> => {
  const [d0, d1] = await streamPair()

  return [
    stubInterface<Connection>({
      newStream: async () => d0,
      streams: [],
      remotePeer: peerB
    }),
    stubInterface<Connection>({
      newStream: async () => d1,
      streams: [],
      remotePeer: peerA
    })
  ]
}
