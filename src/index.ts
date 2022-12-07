import { KadDHT as SingleKadDHT } from './kad-dht.js'
import { DualKadDHT } from './dual-kad-dht.js'
import type { ProvidersInit } from './providers.js'
import type { Selectors, Validators } from '@libp2p/interface-dht'
import type { Registrar } from '@libp2p/interface-registrar'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Metrics } from '@libp2p/interface-metrics'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Datastore } from 'interface-datastore'

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

  /**
   * Initialization options for the Providers component
   */
  providers?: ProvidersInit
}

export interface KadDHTComponents {
  peerId: PeerId
  registrar: Registrar
  addressManager: AddressManager
  peerStore: PeerStore
  metrics?: Metrics
  connectionManager: ConnectionManager
  datastore: Datastore
}

class KadDHT extends DualKadDHT {
  constructor (components: KadDHTComponents, init?: KadDHTInit) {
    super(components, new SingleKadDHT(components, {
      protocolPrefix: '/ipfs',
      ...init,
      lan: false
    }),
    new SingleKadDHT(components, {
      protocolPrefix: '/ipfs',
      ...init,
      clientMode: false,
      lan: true
    }))
  }
}

export function kadDHT (init?: KadDHTInit): (components: KadDHTComponents) => DualKadDHT {
  return (components: KadDHTComponents) => new KadDHT(components, init)
}
