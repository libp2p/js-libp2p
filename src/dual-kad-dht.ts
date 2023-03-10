import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import merge from 'it-merge'
import { queryErrorEvent } from './query/events.js'
import type { KadDHT } from './kad-dht.js'
import type { DualDHT, QueryEvent, QueryOptions } from '@libp2p/interface-dht'
import type { AbortOptions } from '@libp2p/interfaces'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import type { CID } from 'multiformats'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import { symbol } from '@libp2p/interface-peer-discovery'
import type { KadDHTComponents } from './index.js'

const log = logger('libp2p:kad-dht')

/**
 * A DHT implementation modelled after Kademlia with S/Kademlia modifications.
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
export class DualKadDHT extends EventEmitter<PeerDiscoveryEvents> implements DualDHT {
  public readonly wan: KadDHT
  public readonly lan: KadDHT
  public readonly components: KadDHTComponents

  constructor (components: KadDHTComponents, wan: KadDHT, lan: KadDHT) {
    super()

    this.components = components
    this.wan = wan
    this.lan = lan

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
  }

  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] (): '@libp2p/dual-kad-dht' {
    return '@libp2p/dual-kad-dht'
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
    return await this.wan.getMode()
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

      if (event.name === 'DIALING_PEER') {
        queriedPeers = true
      }

      if (event.name === 'VALUE') {
        queriedPeers = true

        if (event.value != null) {
          foundValue = true
        }
      }

      if (event.name === 'SENDING_QUERY') {
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
      })
    }
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value
   */
  async * provide (key: CID, options: AbortOptions = {}): AsyncGenerator<QueryEvent> {
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

      if (event.name === 'SENDING_QUERY') {
        sent++
      }

      if (event.name === 'QUERY_ERROR') {
        errors.push(event.error)
      }

      if (event.name === 'PEER_RESPONSE' && event.messageName === 'ADD_PROVIDER') {
        log('sent provider record for %s to %p', key, event.from)
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

      if (event.name === 'SENDING_QUERY' || event.name === 'FINAL_PEER') {
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
