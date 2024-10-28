import all from 'it-all'
import map from 'it-map'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { convertPeerId } from '../../src/utils.js'
import type { PeerId } from '@libp2p/interface'

/**
 * Sort peers by distance to the given `kadId`
 */
export async function sortClosestPeers <T extends PeerId = PeerId> (peers: T[], kadId: Uint8Array): Promise<T[]> {
  const distances = await all(
    map(peers, async (peer) => {
      const id = await convertPeerId(peer)

      return {
        peer,
        distance: uint8ArrayXor(id, kadId)
      }
    })
  )

  return distances
    .sort((a, b) => {
      return uint8ArrayXorCompare(a.distance, b.distance)
    })
    .map((d) => d.peer)
}
