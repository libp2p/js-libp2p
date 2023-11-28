import { type ContentRouting, contentRoutingSymbol, type PeerDiscovery, peerDiscoverySymbol, type PeerDiscoveryEvents, type PeerRouting, peerRoutingSymbol, type Logger, type PeerId, type PeerInfo } from '@libp2p/interface'
import { CodeError, TypedEventEmitter, CustomEvent } from '@libp2p/interface'
import drain from 'it-drain'
import merge from 'it-merge'
import isPrivate from 'private-ip'
import { DefaultKadDHT } from './kad-dht.js'
import { queryErrorEvent } from './query/events.js'
import type { DualKadDHT, KadDHT, KadDHTComponents, KadDHTInit, QueryEvent, QueryOptions } from './index.js'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { CID } from 'multiformats/cid'

/**
 * Wrapper class to convert events into returned values
 */
class DHTContentRouting implements ContentRouting {
  private readonly dht: KadDHT

  constructor (dht: KadDHT) {
    this.dht = dht
  }

  async provide (cid: CID, options: QueryOptions = {}): Promise<void> {
    await drain(this.dht.provide(cid, options))
  }

  async * findProviders (cid: CID, options: QueryOptions = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options?: QueryOptions): Promise<void> {
    await drain(this.dht.put(key, value, options))
  }

  async get (key: Uint8Array, options?: QueryOptions): Promise<Uint8Array> {
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
class DHTPeerRouting implements PeerRouting {
  private readonly dht: KadDHT

  constructor (dht: KadDHT) {
    this.dht = dht
  }

  async findPeer (peerId: PeerId, options: QueryOptions = {}): Promise<PeerInfo> {
    for await (const event of this.dht.findPeer(peerId, options)) {
      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }

  async * getClosestPeers (key: Uint8Array, options: QueryOptions = {}): AsyncIterable<PeerInfo> {
    for await (const event of this.dht.getClosestPeers(key, options)) {
      if (event.name === 'FINAL_PEER') {
        yield event.peer
      }
    }
  }
}

// see https://github.com/multiformats/multiaddr/blob/master/protocols.csv
const P2P_CIRCUIT_CODE = 290
const DNS4_CODE = 54
const DNS6_CODE = 55
const DNSADDR_CODE = 56
const IP4_CODE = 4
const IP6_CODE = 41

function multiaddrIsPublic (multiaddr: Multiaddr): boolean {
  const tuples = multiaddr.stringTuples()

  // p2p-circuit should not enable server mode
  for (const tuple of tuples) {
    if (tuple[0] === P2P_CIRCUIT_CODE) {
      return false
    }
  }

  // dns4 or dns6 or dnsaddr
  if (tuples[0][0] === DNS4_CODE || tuples[0][0] === DNS6_CODE || tuples[0][0] === DNSADDR_CODE) {
    return true
  }

  // ip4 or ip6
  if (tuples[0][0] === IP4_CODE || tuples[0][0] === IP6_CODE) {
    const result = isPrivate(`${tuples[0][1]}`)
    const isPublic = result == null || !result

    return isPublic
  }

  return false
}

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class DefaultDualKadDHT extends TypedEventEmitter<PeerDiscoveryEvents> implements DualKadDHT, PeerDiscovery {
  public readonly wan: DefaultKadDHT
  public readonly lan: DefaultKadDHT
  public readonly components: KadDHTComponents
  private readonly contentRouting: ContentRouting
  private readonly peerRouting: PeerRouting
  private readonly log: Logger

  constructor (components: KadDHTComponents, init: KadDHTInit = {}) {
    super()

    this.components = components
    this.log = components.logger.forComponent('libp2p:kad-dht')

    this.wan = new DefaultKadDHT(components, {
      protocolPrefix: '/ipfs',
      ...init,
      lan: false
    })
    this.lan = new DefaultKadDHT(components, {
      protocolPrefix: '/ipfs',
      ...init,
      clientMode: false,
      lan: true
    })

    this.contentRouting = new DHTContentRouting(this)
    this.peerRouting = new DHTPeerRouting(this)

    // handle peers being discovered during processing of DHT messages
    this.wan.addEventListener('peer', (evt) => {
      this.dispatchEvent(new CustomEvent('peer', {
        detail: evt.detail
      }))
    })
    this.lan.addEventListener('peer', (evt) => {
      this.dispatchEvent(new CustomEvent('peer', {
        detail: evt.detail
      }))
    })

    // if client mode has not been explicitly specified, auto-switch to server
    // mode when the node's peer data is updated with publicly dialable addresses
    if (init.clientMode == null) {
      components.events.addEventListener('self:peer:update', (evt) => {
        this.log('received update of self-peer info')
        const hasPublicAddress = evt.detail.peer.addresses
          .some(({ multiaddr }) => multiaddrIsPublic(multiaddr))

        this.getMode()
          .then(async mode => {
            if (hasPublicAddress && mode === 'client') {
              await this.setMode('server')
            } else if (mode === 'server' && !hasPublicAddress) {
              await this.setMode('client')
            }
          })
          .catch(err => {
            this.log.error('error setting dht server mode', err)
          })
      })
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/dual-kad-dht'

  get [contentRoutingSymbol] (): ContentRouting {
    return this.contentRouting
  }

  get [peerRoutingSymbol] (): PeerRouting {
    return this.peerRouting
  }

  get [peerDiscoverySymbol] (): PeerDiscovery {
    return this
  }

  /**
   * Is this DHT running.
   */
  isStarted (): boolean {
    return this.wan.isStarted() && this.lan.isStarted()
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  async getMode (): Promise<'client' | 'server'> {
    return this.wan.getMode()
  }

  /**
   * If 'server' this node will respond to DHT queries, if 'client' this node will not
   */
  async setMode (mode: 'client' | 'server'): Promise<void> {
    await this.wan.setMode(mode)
  }

  /**
   * Start listening to incoming connections.
   */
  async start (): Promise<void> {
    await Promise.all([
      this.lan.start(),
      this.wan.start()
    ])
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   */
  async stop (): Promise<void> {
    await Promise.all([
      this.lan.stop(),
      this.wan.stop()
    ])
  }

  /**
   * Store the given key/value pair in the DHT
   */
  async * put (key: Uint8Array, value: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    for await (const event of merge(
      this.lan.put(key, value, options),
      this.wan.put(key, value, options)
    )) {
      yield event
    }
  }

  /**
   * Get the value that corresponds to the passed key
   */
  async * get (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    let queriedPeers = false
    let foundValue = false

    for await (const event of merge(
      this.lan.get(key, options),
      this.wan.get(key, options)
    )) {
      yield event

      if (event.name === 'DIAL_PEER') {
        queriedPeers = true
      }

      if (event.name === 'VALUE') {
        queriedPeers = true

        if (event.value != null) {
          foundValue = true
        }
      }

      if (event.name === 'SEND_QUERY') {
        queriedPeers = true
      }
    }

    if (!queriedPeers) {
      throw new CodeError('No peers found in routing table!', 'ERR_NO_PEERS_IN_ROUTING_TABLE')
    }

    if (!foundValue) {
      yield queryErrorEvent({
        from: this.components.peerId,
        error: new CodeError('Not found', 'ERR_NOT_FOUND')
      }, options)
    }
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value
   */
  async * provide (key: CID, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    let sent = 0
    let success = 0
    const errors = []

    const dhts = [this.lan]

    // only run provide on the wan if we are in server mode
    if ((await this.wan.getMode()) === 'server') {
      dhts.push(this.wan)
    }

    for await (const event of merge(...dhts.map(dht => dht.provide(key, options)))) {
      yield event

      if (event.name === 'SEND_QUERY') {
        sent++
      }

      if (event.name === 'QUERY_ERROR') {
        errors.push(event.error)
      }

      if (event.name === 'PEER_RESPONSE' && event.messageName === 'ADD_PROVIDER') {
        this.log('sent provider record for %s to %p', key, event.from)
        success++
      }
    }

    if (success === 0) {
      if (errors.length > 0) {
        // if all sends failed, throw an error to inform the caller
        throw new CodeError(`Failed to provide to ${errors.length} of ${sent} peers`, 'ERR_PROVIDES_FAILED', { errors })
      }

      throw new CodeError('Failed to provide - no peers found', 'ERR_PROVIDES_FAILED')
    }
  }

  /**
   * Search the dht for up to `K` providers of the given CID
   */
  async * findProviders (key: CID, options: QueryOptions = {}): AsyncGenerator<QueryEvent, void, undefined> {
    yield * merge(
      this.lan.findProviders(key, options),
      this.wan.findProviders(key, options)
    )
  }

  // ----------- Peer Routing -----------

  /**
   * Search for a peer with the given ID
   */
  async * findPeer (id: PeerId, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    let queriedPeers = false

    for await (const event of merge(
      this.lan.findPeer(id, options),
      this.wan.findPeer(id, options)
    )) {
      yield event

      if (event.name === 'SEND_QUERY' || event.name === 'FINAL_PEER') {
        queriedPeers = true
      }
    }

    if (!queriedPeers) {
      throw new CodeError('Peer lookup failed', 'ERR_LOOKUP_FAILED')
    }
  }

  /**
   * Kademlia 'node lookup' operation
   */
  async * getClosestPeers (key: Uint8Array, options: QueryOptions = {}): AsyncGenerator<QueryEvent, void, undefined> {
    yield * merge(
      this.lan.getClosestPeers(key, options),
      this.wan.getClosestPeers(key, options)
    )
  }

  async refreshRoutingTable (): Promise<void> {
    await Promise.all([
      this.lan.refreshRoutingTable(),
      this.wan.refreshRoutingTable()
    ])
  }
}
