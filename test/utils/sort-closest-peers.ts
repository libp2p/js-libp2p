import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { compare as uint8ArrayCompare } from 'uint8arrays/compare'
import { convertPeerId } from '../../src/utils.js'
import all from 'it-all'
import map from 'it-map'
import type { PeerId } from '@libp2p/interface-peer-id'

/**
 * Sort peers by distance to the given `kadId`
 */
export async function sortClosestPeers (peers: PeerId[], kadId: Uint8Array) {
  const distances = await all(
    map(peers, async (peer) => {
      const id = await convertPeerId(peer)

      return {
        peer: peer,
        distance: uint8ArrayXor(id, kadId)
      }
    })
  )

  return distances
    .sort((a, b) => {
      return uint8ArrayCompare(a.distance, b.distance)
    })
    .map((d) => d.peer)
}
