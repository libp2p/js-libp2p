import { KadDHT as SingleKadDHT } from './kad-dht.js'
import { DualKadDHT } from './dual-kad-dht.js'
import type { Selectors, Validators } from '@libp2p/interface-dht'

export interface KadDHTInit {
  /**
   * How many peers to store in each kBucket (default 20)
   */
  kBucketSize?: number

  /**
   * Whether to start up as a DHT client or server
   */
  clientMode?: boolean

  /**
   * Record selectors
   */
  selectors?: Selectors

  /**
   * Record validators
   */
  validators?: Validators

  /**
   * How often to query our own PeerId in order to ensure we have a
   * good view on the KAD address space local to our PeerId
   */
  querySelfInterval?: number

  /**
   * A custom protocol prefix to use (default: '/ipfs')
   */
  protocolPrefix?: string

  /**
   * How long to wait in ms when pinging DHT peers to decide if they
   * should be evicted from the routing table or not (default 10000)
   */
  pingTimeout?: number

  /**
   * How many peers to ping in parallel when deciding if they should
   * be evicted from the routing table or not (default 10)
   */
  pingConcurrency?: number

  /**
   * How many parallel incoming streams to allow on the DHT protocol per-connection
   */
  maxInboundStreams?: number

  /**
   * How many parallel outgoing streams to allow on the DHT protocol per-connection
   */
  maxOutboundStreams?: number
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
