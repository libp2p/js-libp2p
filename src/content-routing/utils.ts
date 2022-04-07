import errCode from 'err-code'
import filter from 'it-filter'
import map from 'it-map'
import type { Source } from 'it-stream-types'
import type { PeerInfo } from '@libp2p/interfaces/peer-info'
import type { PeerStore } from '@libp2p/interfaces/peer-store'

/**
 * Store the multiaddrs from every peer in the passed peer store
 */
export async function * storeAddresses (source: Source<PeerInfo>, peerStore: PeerStore) {
  yield * map(source, async (peer) => {
    // ensure we have the addresses for a given peer
    await peerStore.addressBook.add(peer.id, peer.multiaddrs)

    return peer
  })
}

/**
 * Filter peers by unique peer id
 */
export function uniquePeers (source: Source<PeerInfo>) {
  /** @type Set<string> */
  const seen = new Set()

  return filter(source, (peer) => {
    // dedupe by peer id
    if (seen.has(peer.id.toString())) {
      return false
    }

    seen.add(peer.id.toString())

    return true
  })
}

/**
 * Require at least `min` peers to be yielded from `source`
 */
export async function * requirePeers (source: Source<PeerInfo>, min: number = 1) {
  let seen = 0

  for await (const peer of source) {
    seen++

    yield peer
  }

  if (seen < min) {
    throw errCode(new Error('not found'), 'NOT_FOUND')
  }
}
