import { PeerSet } from '@libp2p/peer-collections'
import { Queue } from '@libp2p/utils/queue'
import { pushable } from 'it-pushable'
import { ALPHA } from '../constants.js'
import { MessageType } from '../message/dht.js'
import { toPbPeerInfo } from '../message/utils.js'
import {
  queryErrorEvent,
  peerResponseEvent,
  providerEvent
} from '../query/events.js'
import type { FinalPeerEvent, KadDHTComponents, PeerResponseEvent, ProviderEvent, QueryEvent } from '../index.js'
import type { Message } from '../message/dht.js'
import type { Network } from '../network.js'
import type { PeerRouting } from '../peer-routing/index.js'
import type { Providers } from '../providers.js'
import type { QueryManager } from '../query/manager.js'
import type { QueryFunc } from '../query/types.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { Logger, PeerInfo, RoutingOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { CID } from 'multiformats/cid'

export interface ContentRoutingInit {
  network: Network
  peerRouting: PeerRouting
  queryManager: QueryManager
  routingTable: RoutingTable
  providers: Providers
  logPrefix: string
}

export class ContentRouting {
  private readonly log: Logger
  private readonly components: KadDHTComponents
  private readonly network: Network
  private readonly peerRouting: PeerRouting
  private readonly queryManager: QueryManager
  private readonly routingTable: RoutingTable
  private readonly providers: Providers

  constructor (components: KadDHTComponents, init: ContentRoutingInit) {
    const { network, peerRouting, queryManager, routingTable, providers, logPrefix } = init

    this.components = components
    this.log = components.logger.forComponent(`${logPrefix}:content-routing`)
    this.network = network
    this.peerRouting = peerRouting
    this.queryManager = queryManager
    this.routingTable = routingTable
    this.providers = providers

    this.findProviders = components.metrics?.traceFunction('libp2p.kadDHT.findProviders', this.findProviders.bind(this), {
      optionsIndex: 1,
      getAttributesFromYieldedValue: (event, attrs: { providers?: string[] }) => {
        if (event.name === 'PROVIDER') {
          attrs.providers ??= []
          attrs.providers.push(...event.providers.map(info => info.id.toString()))
        }

        return attrs
      }
    }) ?? this.findProviders
    this.provide = components.metrics?.traceFunction('libp2p.kadDHT.provide', this.provide.bind(this), {
      optionsIndex: 1,
      getAttributesFromYieldedValue: (event, attrs: { providers?: string[] }) => {
        if (event.name === 'PEER_RESPONSE' && event.messageName === 'ADD_PROVIDER') {
          attrs.providers ??= []
          attrs.providers.push(event.from.toString())
        }

        return attrs
      }
    }) ?? this.provide
  }

  /**
   * Announce to the network that we can provide the value for a given key and
   * are contactable on the given multiaddrs
   */
  async * provide (key: CID, multiaddrs: Multiaddr[], options: RoutingOptions = {}): AsyncGenerator<QueryEvent, void, undefined> {
    this.log('provide %s', key)
    const target = key.multihash.bytes

    // Add peer as provider
    await this.providers.addProvider(key, this.components.peerId, options)

    const msg: Partial<Message> = {
      type: MessageType.ADD_PROVIDER,
      key: target,
      providers: [
        toPbPeerInfo({
          id: this.components.peerId,
          multiaddrs
        })
      ]
    }

    let sent = 0
    const self = this

    async function * publishProviderRecord (event: FinalPeerEvent): AsyncGenerator<QueryEvent, void, undefined> {
      try {
        self.log('sending provider record for %s to %p', key, event.peer.id)

        for await (const addProviderEvent of self.network.sendMessage(event.peer.id, msg, {
          ...options,
          path: event.path
        })) {
          if (addProviderEvent.name === 'PEER_RESPONSE') {
            self.log('sent provider record for %s to %p', key, event.peer.id)
            sent++
          }

          yield addProviderEvent
        }
      } catch (err: any) {
        self.log.error('error sending provide record to peer %p', event.peer.id, err)
        yield queryErrorEvent({
          from: event.peer.id,
          error: err,
          path: event.path
        }, options)
      }
    }

    const events = pushable<QueryEvent>({
      objectMode: true
    })

    const queue = new Queue({
      concurrency: ALPHA
    })
    queue.addEventListener('idle', () => {
      events.end()
    })
    queue.addEventListener('error', (err) => {
      this.log.error('error publishing provider record to peer - %e', err)
    })

    queue.add(async () => {
      const finalPeerEvents: FinalPeerEvent[] = []

      for await (const event of this.peerRouting.getClosestPeers(target, options)) {
        events.push(event)

        if (event.name !== 'FINAL_PEER') {
          continue
        }

        finalPeerEvents.push(event)
      }

      finalPeerEvents.forEach(event => {
        queue.add(async () => {
          for await (const notifyEvent of publishProviderRecord(event)) {
            events.push(notifyEvent)
          }
        })
          .catch(err => {
            this.log.error('error publishing provider record to peer - %e', err)
          })
      })
    })
      .catch(err => {
        events.end(err)
      })

    yield * events

    this.log('sent provider records to %d peers', sent)
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   */
  async * findProviders (key: CID, options: RoutingOptions): AsyncGenerator<PeerResponseEvent | ProviderEvent | QueryEvent> {
    const toFind = this.routingTable.kBucketSize
    let found = 0
    const target = key.multihash.bytes
    const self = this

    this.log('findProviders %c', key)

    const provs = await this.providers.getProviders(key, options)

    // yield values if we have some, also slice because maybe we got lucky and already have too many?
    if (provs.length > 0) {
      const providers: PeerInfo[] = []

      for (const peerId of provs.slice(0, toFind)) {
        try {
          const peer = await this.components.peerStore.get(peerId, options)

          providers.push({
            id: peerId,
            multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr)
          })
        } catch (err: any) {
          if (err.name !== 'NotFoundError') {
            throw err
          }

          this.log('no peer store entry for %p', peerId)
        }
      }

      yield peerResponseEvent({
        from: this.components.peerId,
        messageType: MessageType.GET_PROVIDERS,
        providers,
        path: {
          index: -1,
          queued: 0,
          running: 0,
          total: 0
        }
      }, options)
      yield providerEvent({
        from: this.components.peerId,
        providers,
        path: {
          index: -1,
          queued: 0,
          running: 0,
          total: 0
        }
      }, options)

      found += providers.length

      if (found >= toFind) {
        return
      }
    }

    /**
     * The query function to use on this particular disjoint path
     */
    const findProvidersQuery: QueryFunc = async function * ({ peer, signal, path }) {
      const request = {
        type: MessageType.GET_PROVIDERS,
        key: target
      }

      yield * self.network.sendRequest(peer.id, request, {
        ...options,
        signal,
        path
      })
    }

    const providers = new PeerSet(provs)

    for await (const event of this.queryManager.run(target, findProvidersQuery, options)) {
      yield event

      if (event.name === 'PEER_RESPONSE') {
        this.log('Found %d provider entries for %c and %d closer peers', event.providers.length, key, event.closer.length)

        const newProviders = []

        for (const peer of event.providers) {
          if (providers.has(peer.id)) {
            continue
          }

          providers.add(peer.id)
          newProviders.push(peer)
        }

        if (newProviders.length > 0) {
          yield providerEvent({
            from: event.from,
            providers: newProviders,
            path: event.path
          }, options)

          found += newProviders.length

          if (found >= toFind) {
            return
          }
        }
      }
    }
  }
}
