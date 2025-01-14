import all from 'it-all'
import map from 'it-map'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { convertPeerId } from '../../src/utils.js'
import type { KadDHT } from '../../src/kad-dht.js'
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

export async function sortDHTs <T extends KadDHT[]> (dhts: T, kadId: Uint8Array): Promise<T> {
  const distances = await all(
    map(dhts, async (dht) => {
      const id = await convertPeerId(dht.components.peerId)

      return {
        dht,
        distance: uint8ArrayXor(id, kadId)
      }
    })
  )

  // @ts-expect-error KadDHT may not be T
  return distances
    .sort((a, b) => {
      return uint8ArrayXorCompare(a.distance, b.distance)
    })
    .map((d) => d.dht)
}
