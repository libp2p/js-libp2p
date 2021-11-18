'use strict'

const { Message } = require('../message')
const parallel = require('it-parallel')
const map = require('it-map')
const { convertBuffer, logger } = require('../utils')
const { ALPHA } = require('../constants')
const { pipe } = require('it-pipe')
const {
  queryErrorEvent,
  peerResponseEvent,
  providerEvent
} = require('../query/events')
const { Message: { MessageType } } = require('../message/dht')

/**
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

class ContentRouting {
  /**
   * @param {object} params
   * @param {import('peer-id')} params.peerId
   * @param {import('../network').Network} params.network
   * @param {import('../peer-routing').PeerRouting} params.peerRouting
   * @param {import('../query/manager').QueryManager} params.queryManager
   * @param {import('../routing-table').RoutingTable} params.routingTable
   * @param {import('../providers').Providers} params.providers
   * @param {import('../types').PeerStore} params.peerStore
   * @param {boolean} params.lan
   */
  constructor ({ peerId, network, peerRouting, queryManager, routingTable, providers, peerStore, lan }) {
    this._log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:content-routing`)
    this._peerId = peerId
    this._network = network
    this._peerRouting = peerRouting
    this._queryManager = queryManager
    this._routingTable = routingTable
    this._providers = providers
    this._peerStore = peerStore
  }

  /**
   * Announce to the network that we can provide the value for a given key and
   * are contactable on the given multiaddrs
   *
   * @param {CID} key
   * @param {Multiaddr[]} multiaddrs
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async * provide (key, multiaddrs, options = {}) {
    this._log('provide %s', key)

    // Add peer as provider
    await this._providers.addProvider(key, this._peerId)

    const msg = new Message(Message.TYPES.ADD_PROVIDER, key.bytes, 0)
    msg.providerPeers = [{
      id: this._peerId,
      multiaddrs
    }]

    let sent = 0

    /**
     * @param {import('../types').QueryEvent} event
     */
    const maybeNotifyPeer = (event) => {
      return async () => {
        if (event.name !== 'FINAL_PEER') {
          return [event]
        }

        const events = []

        this._log('putProvider %s to %p', key, event.peer.id)

        try {
          this._log('sending provider record for %s to %p', key, event.peer.id)

          for await (const sendEvent of this._network.sendMessage(event.peer.id, msg, options)) {
            if (sendEvent.name === 'PEER_RESPONSE') {
              this._log('sent provider record for %s to %p', key, event.peer.id)
              sent++
            }

            events.push(sendEvent)
          }
        } catch (/** @type {any} */ err) {
          this._log.error('error sending provide record to peer %p', event.peer.id, err)
          events.push(queryErrorEvent({ from: event.peer.id, error: err }))
        }

        return events
      }
    }

    // Notify closest peers
    yield * pipe(
      this._peerRouting.getClosestPeers(key.multihash.bytes, options),
      (source) => map(source, (event) => maybeNotifyPeer(event)),
      (source) => parallel(source, {
        ordered: false,
        concurrency: ALPHA
      }),
      async function * (source) {
        for await (const events of source) {
          yield * events
        }
      }
    )

    this._log('sent provider records to %d peers', sent)
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   *
   * @param {CID} key
   * @param {object} [options] - findProviders options
   * @param {number} [options.maxNumProviders=5] - maximum number of providers to find
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.queryFuncTimeout]
   */
  async * findProviders (key, options = { maxNumProviders: 5 }) {
    const toFind = options.maxNumProviders || this._routingTable._kBucketSize
    const target = key.multihash.bytes
    const id = await convertBuffer(target)
    const self = this

    this._log(`findProviders ${key}`)

    const provs = await this._providers.getProviders(key)

    // yield values if we have some, also slice because maybe we got lucky and already have too many?
    if (provs.length) {
      const providers = provs.slice(0, toFind).map(peerId => ({
        id: peerId,
        multiaddrs: (this._peerStore.addressBook.get(peerId) || []).map(address => address.multiaddr)
      }))

      yield peerResponseEvent({ from: this._peerId, messageType: MessageType.GET_PROVIDERS, providers })
      yield providerEvent({ from: this._peerId, providers: providers })
    }

    // All done
    if (provs.length >= toFind) {
      return
    }

    /**
     * The query function to use on this particular disjoint path
     *
     * @type {import('../query/types').QueryFunc}
     */
    const findProvidersQuery = async function * ({ peer, signal }) {
      const request = new Message(Message.TYPES.GET_PROVIDERS, target, 0)

      yield * self._network.sendRequest(peer, request, { signal })
    }

    const providers = new Set(provs.map(p => p.toB58String()))

    for await (const event of this._queryManager.run(target, this._routingTable.closestPeers(id), findProvidersQuery, options)) {
      yield event

      if (event.name === 'PEER_RESPONSE') {
        this._log(`Found ${event.providers.length} provider entries for ${key} and ${event.closer.length} closer peers`)

        const newProviders = []

        for (const peer of event.providers) {
          if (providers.has(peer.id.toB58String())) {
            continue
          }

          providers.add(peer.id.toB58String())
          newProviders.push(peer)
        }

        if (newProviders.length) {
          yield providerEvent({ from: event.from, providers: newProviders })
        }

        if (providers.size === toFind) {
          return
        }
      }
    }
  }
}

module.exports.ContentRouting = ContentRouting
