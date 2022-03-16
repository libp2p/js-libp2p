import { KadDHT as SingleKadDHT } from './kad-dht.js'
import { DualKadDHT } from './dual-kad-dht.js'
import type { Selectors, Validators } from '@libp2p/interfaces/dht'

export interface KadDHTInit {
  kBucketSize?: number
  clientMode?: boolean
  selectors?: Selectors
  validators?: Validators
  querySelfInterval?: number
  lan?: boolean
  protocolPrefix?: string
}

export class KadDHT extends DualKadDHT {
  constructor (init?: KadDHTInit) {
    super(new SingleKadDHT({
      protocolPrefix: '/ipfs',
      ...init,
      lan: false
    }),
    new SingleKadDHT({
      protocolPrefix: '/ipfs',
      ...init,
      clientMode: false,
      lan: true
    }))
  }
}
