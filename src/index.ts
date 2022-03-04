import { KadDHT, KadDHTOptions } from './kad-dht.js'
import { DualKadDHT } from './dual-kad-dht.js'
import type { DHT } from '@libp2p/interfaces/dht'

export function createKadDHT (opts: KadDHTOptions): DHT {
  return new DualKadDHT(
    new KadDHT({
      ...opts,
      protocol: '/ipfs/kad/1.0.0',
      lan: false
    }),
    new KadDHT({
      ...opts,
      protocol: '/ipfs/lan/kad/1.0.0',
      clientMode: false,
      lan: true
    }),
    opts.peerId,
    opts.peerStore
  )
}
