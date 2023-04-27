import { KadDHT as SingleKadDHT } from './kad-dht.js'
import { DualKadDHT } from './dual-kad-dht.js'
import drain from 'it-drain'
import { CodeError } from '@libp2p/interfaces/errors'
import type { DHT, DualDHT, Selectors, Validators } from '@libp2p/interface-dht'
import { ContentRouting, contentRouting } from '@libp2p/interface-content-routing'
import type { CID } from 'multiformats/cid'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { ProvidersInit } from './providers.js'
import type { Registrar } from '@libp2p/interface-registrar'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { Metrics } from '@libp2p/interface-metrics'
import type { Datastore } from 'interface-datastore'
import { PeerRouting, peerRouting } from '@libp2p/interface-peer-routing'
import { PeerDiscovery, peerDiscovery } from '@libp2p/interface-peer-discovery'
import type { PeerId } from '@libp2p/interface-peer-id'

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

/**
 * Wrapper class to convert events into returned values
 */
export class DHTContentRouting implements ContentRouting {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async provide (cid: CID): Promise<void> {
    await drain(this.dht.provide(cid))
  }

  async * findProviders (cid: CID, options: AbortOptions = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options?: AbortOptions): Promise<void> {
    await drain(this.dht.put(key, value, options))
  }

  async get (key: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    for await (const event of this.dht.get(key, options)) {
      if (event.name === 'VALUE') {
        return event.value
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }
}

/**
 * Wrapper class to convert events into returned values
 */
export class DHTPeerRouting implements PeerRouting {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async findPeer (peerId: PeerId, options: AbortOptions = {}): Promise<PeerInfo> {
    for await (const event of this.dht.findPeer(peerId, options)) {
      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }

  async * getClosestPeers (key: Uint8Array, options: AbortOptions = {}): AsyncIterable<PeerInfo> {
    for await (const event of this.dht.getClosestPeers(key, options)) {
      if (event.name === 'FINAL_PEER') {
        yield event.peer
      }
    }
  }
}

class KadDHT extends DualKadDHT {
  private readonly contentRouting: ContentRouting
  private readonly peerRouting: PeerRouting

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

    this.contentRouting = new DHTContentRouting(this)
    this.peerRouting = new DHTPeerRouting(this)
  }

  get [contentRouting] (): ContentRouting {
    return this.contentRouting
  }

  get [peerRouting] (): PeerRouting {
    return this.peerRouting
  }

  get [peerDiscovery] (): PeerDiscovery {
    return this
  }
}

export function kadDHT (init?: KadDHTInit): (components: KadDHTComponents) => DualDHT {
  return (components: KadDHTComponents) => new KadDHT(components, init)
}
