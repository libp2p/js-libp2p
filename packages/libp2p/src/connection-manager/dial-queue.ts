/* eslint-disable max-depth */
import { CodeError, AggregateCodeError, ERR_TIMEOUT, setMaxListeners } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { defaultAddressSort } from '@libp2p/utils/address-sort'
import { Queue, type QueueAddOptions } from '@libp2p/utils/queue'
import { type Multiaddr, type Resolver, resolvers, multiaddr } from '@multiformats/multiaddr'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import { Circuit } from '@multiformats/multiaddr-matcher'
import { type ClearableSignal, anySignal } from 'any-signal'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { codes } from '../errors.js'
import { getPeerAddress } from '../get-peer.js'
import {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PEER_ADDRS_TO_DIAL,
  LAST_DIAL_FAILURE_KEY,
  MAX_DIAL_QUEUE_LENGTH
} from './constants.js'
import { resolveMultiaddrs } from './utils.js'
import type { AddressSorter, AbortOptions, ComponentLogger, Logger, Connection, ConnectionGater, Metrics, PeerId, Address, PeerStore, PeerRouting, IsDialableOptions } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { DNS } from '@multiformats/dns'

export interface PendingDialTarget {
  resolve(value: any): void
  reject(err: Error): void
}

export interface DialOptions extends AbortOptions {
  priority?: number
  force?: boolean
}

interface DialQueueJobOptions extends QueueAddOptions {
  peerId?: PeerId
  multiaddrs: Set<string>
}

interface DialerInit {
  addressSorter?: AddressSorter
  maxParallelDials?: number
  maxDialQueueLength?: number
  maxPeerAddrsToDial?: number
  dialTimeout?: number
  resolvers?: Record<string, Resolver>
  connections?: PeerMap<Connection[]>
}

const defaultOptions = {
  addressSorter: defaultAddressSort,
  maxParallelDials: MAX_PARALLEL_DIALS,
  maxDialQueueLength: MAX_DIAL_QUEUE_LENGTH,
  maxPeerAddrsToDial: MAX_PEER_ADDRS_TO_DIAL,
  dialTimeout: DIAL_TIMEOUT,
  resolvers: {
    dnsaddr: dnsaddrResolver
  }
}

interface DialQueueComponents {
  peerId: PeerId
  metrics?: Metrics
  peerStore: PeerStore
  peerRouting: PeerRouting
  transportManager: TransportManager
  connectionGater: ConnectionGater
  logger: ComponentLogger
  dns?: DNS
}

export class DialQueue {
  public queue: Queue<Connection, DialQueueJobOptions>
  private readonly components: DialQueueComponents
  private readonly addressSorter: AddressSorter
  private readonly maxPeerAddrsToDial: number
  private readonly maxDialQueueLength: number
  private readonly dialTimeout: number
  private shutDownController: AbortController
  private readonly connections: PeerMap<Connection[]>
  private readonly log: Logger

  constructor (components: DialQueueComponents, init: DialerInit = {}) {
    this.addressSorter = init.addressSorter ?? defaultOptions.addressSorter
    this.maxPeerAddrsToDial = init.maxPeerAddrsToDial ?? defaultOptions.maxPeerAddrsToDial
    this.maxDialQueueLength = init.maxDialQueueLength ?? defaultOptions.maxDialQueueLength
    this.dialTimeout = init.dialTimeout ?? defaultOptions.dialTimeout
    this.connections = init.connections ?? new PeerMap()
    this.log = components.logger.forComponent('libp2p:connection-manager:dial-queue')
    this.components = components

    this.shutDownController = new AbortController()
    setMaxListeners(Infinity, this.shutDownController.signal)

    for (const [key, value] of Object.entries(init.resolvers ?? {})) {
      resolvers.set(key, value)
    }

    // controls dial concurrency
    this.queue = new Queue({
      concurrency: init.maxParallelDials ?? defaultOptions.maxParallelDials,
      metricName: 'libp2p_dial_queue',
      metrics: components.metrics
    })
    // a started job errored
    this.queue.addEventListener('error', (event) => {
      this.log.error('error in dial queue', event.detail)
    })
  }

  start (): void {
    this.shutDownController = new AbortController()
    setMaxListeners(Infinity, this.shutDownController.signal)
  }

  /**
   * Clears any pending dials
   */
  stop (): void {
    this.shutDownController.abort()
    this.queue.abort()
  }

  /**
   * Connects to a given peer, multiaddr or list of multiaddrs.
   *
   * If a peer is passed, all known multiaddrs will be tried. If a multiaddr or
   * multiaddrs are passed only those will be dialled.
   *
   * Where a list of multiaddrs is passed, if any contain a peer id then all
   * multiaddrs in the list must contain the same peer id.
   *
   * The dial to the first address that is successfully able to upgrade a
   * connection will be used, all other dials will be aborted when that happens.
   */
  async dial (peerIdOrMultiaddr: PeerId | Multiaddr | Multiaddr[], options: DialOptions = {}): Promise<Connection> {
    const { peerId, multiaddrs } = getPeerAddress(peerIdOrMultiaddr)

    // make sure we don't have an existing connection to any of the addresses we
    // are about to dial
    const existingConnection = Array.from(this.connections.values()).flat().find(conn => {
      if (options.force === true) {
        return false
      }

      if (conn.remotePeer.equals(peerId)) {
        return true
      }

      return multiaddrs.find(addr => {
        return addr.equals(conn.remoteAddr)
      })
    })

    if (existingConnection != null) {
      this.log('already connected to %a', existingConnection.remoteAddr)
      return existingConnection
    }

    // ready to dial, all async work finished - make sure we don't have any
    // pending dials in progress for this peer or set of multiaddrs
    const existingDial = this.queue.queue.find(job => {
      if (peerId?.equals(job.options.peerId) === true) {
        return true
      }

      // does the dial contain any of the target multiaddrs?
      const addresses = job.options.multiaddrs

      if (addresses == null) {
        return false
      }

      for (const multiaddr of multiaddrs) {
        if (addresses.has(multiaddr.toString())) {
          return true
        }
      }

      return false
    })

    if (existingDial != null) {
      this.log('joining existing dial target for %p', peerId)

      // add all multiaddrs to the dial target
      for (const multiaddr of multiaddrs) {
        existingDial.options.multiaddrs.add(multiaddr.toString())
      }

      return existingDial.join(options)
    }

    if (this.queue.size >= this.maxDialQueueLength) {
      throw new CodeError('Dial queue is full', 'ERR_DIAL_QUEUE_FULL')
    }

    this.log('creating dial target for %p', peerId, multiaddrs.map(ma => ma.toString()))

    return this.queue.add(async (options) => {
      // create abort conditions - need to do this before `calculateMultiaddrs` as
      // we may be about to resolve a dns addr which can time out
      const signal = this.createDialAbortController(options?.signal)
      let addrsToDial: Address[]

      try {
        // load addresses from address book, resolve and dnsaddrs, filter
        // undiallables, add peer IDs, etc
        addrsToDial = await this.calculateMultiaddrs(peerId, options?.multiaddrs, {
          ...options,
          signal
        })

        addrsToDial.map(({ multiaddr }) => multiaddr.toString()).forEach(addr => {
          options?.multiaddrs.add(addr)
        })
      } catch (err) {
        signal.clear()
        throw err
      }

      try {
        let dialed = 0
        const errors: Error[] = []

        for (const address of addrsToDial) {
          if (dialed === this.maxPeerAddrsToDial) {
            this.log('dialed maxPeerAddrsToDial (%d) addresses for %p, not trying any others', dialed, peerId)

            throw new CodeError('Peer had more than maxPeerAddrsToDial', codes.ERR_TOO_MANY_ADDRESSES)
          }

          dialed++

          try {
            const conn = await this.components.transportManager.dial(address.multiaddr, {
              ...options,
              signal
            })

            this.log('dial to %a succeeded', address.multiaddr)

            return conn
          } catch (err: any) {
            this.log.error('dial failed to %a', address.multiaddr, err)

            if (peerId != null) {
              // record the failed dial
              try {
                await this.components.peerStore.patch(peerId, {
                  metadata: {
                    [LAST_DIAL_FAILURE_KEY]: uint8ArrayFromString(Date.now().toString())
                  }
                })
              } catch (err: any) {
                this.log.error('could not update last dial failure key for %p', peerId, err)
              }
            }

            // the user/dial timeout/shutdown controller signal aborted
            if (signal.aborted) {
              throw new CodeError(err.message, ERR_TIMEOUT)
            }

            errors.push(err)
          }
        }

        if (errors.length === 1) {
          throw errors[0]
        }

        throw new AggregateCodeError(errors, 'All multiaddr dials failed', codes.ERR_TRANSPORT_DIAL_FAILED)
      } finally {
        // clean up abort signals/controllers
        signal.clear()
      }
    }, {
      peerId,
      priority: options.priority,
      multiaddrs: new Set(multiaddrs.map(ma => ma.toString())),
      signal: options.signal
    })
  }

  private createDialAbortController (userSignal?: AbortSignal): ClearableSignal {
    // let any signal abort the dial
    const signal = anySignal([
      AbortSignal.timeout(this.dialTimeout),
      this.shutDownController.signal,
      userSignal
    ])

    // This emitter gets listened to a lot
    setMaxListeners(Infinity, signal)

    return signal
  }

  // eslint-disable-next-line complexity
  private async calculateMultiaddrs (peerId?: PeerId, multiaddrs: Set<string> = new Set<string>(), options: DialOptions = {}): Promise<Address[]> {
    const addrs: Address[] = [...multiaddrs].map(ma => ({
      multiaddr: multiaddr(ma),
      isCertified: false
    }))

    // if a peer id or multiaddr(s) with a peer id, make sure it isn't our peer id and that we are allowed to dial it
    if (peerId != null) {
      if (this.components.peerId.equals(peerId)) {
        throw new CodeError('Tried to dial self', codes.ERR_DIALED_SELF)
      }

      if ((await this.components.connectionGater.denyDialPeer?.(peerId)) === true) {
        throw new CodeError('The dial request is blocked by gater.allowDialPeer', codes.ERR_PEER_DIAL_INTERCEPTED)
      }

      // if just a peer id was passed, load available multiaddrs for this peer
      // from the peer store
      if (addrs.length === 0) {
        this.log('loading multiaddrs for %p', peerId)
        try {
          const peer = await this.components.peerStore.get(peerId)
          addrs.push(...peer.addresses)
          this.log('loaded multiaddrs for %p', peerId, addrs.map(({ multiaddr }) => multiaddr.toString()))
        } catch (err: any) {
          if (err.code !== codes.ERR_NOT_FOUND) {
            throw err
          }
        }
      }

      // if we still don't have any addresses for this peer, try a lookup
      // using the peer routing
      if (addrs.length === 0) {
        this.log('looking up multiaddrs for %p in the peer routing', peerId)

        try {
          const peerInfo = await this.components.peerRouting.findPeer(peerId)

          this.log('found multiaddrs for %p in the peer routing', peerId, addrs.map(({ multiaddr }) => multiaddr.toString()))

          addrs.push(...peerInfo.multiaddrs.map(multiaddr => ({
            multiaddr,
            isCertified: false
          })))
        } catch (err: any) {
          if (err.code !== codes.ERR_NO_ROUTERS_AVAILABLE) {
            this.log.error('looking up multiaddrs for %p in the peer routing failed', peerId, err)
          }
        }
      }
    }

    // resolve addresses - this can result in a one-to-many translation when
    // dnsaddrs are resolved
    let resolvedAddresses = (await Promise.all(
      addrs.map(async addr => {
        const result = await resolveMultiaddrs(addr.multiaddr, {
          dns: this.components.dns,
          ...options,
          log: this.log
        })

        if (result.length === 1 && result[0].equals(addr.multiaddr)) {
          return addr
        }

        return result.map(multiaddr => ({
          multiaddr,
          isCertified: false
        }))
      })
    ))
      .flat()

    // ensure the peer id is appended to the multiaddr
    if (peerId != null) {
      const peerIdMultiaddr = `/p2p/${peerId.toString()}`
      resolvedAddresses = resolvedAddresses.map(addr => {
        const lastProto = addr.multiaddr.protos().pop()

        // do not append peer id to path multiaddrs
        if (lastProto?.path === true) {
          return addr
        }

        // append peer id to multiaddr if it is not already present
        if (addr.multiaddr.getPeerId() == null) {
          return {
            multiaddr: addr.multiaddr.encapsulate(peerIdMultiaddr),
            isCertified: addr.isCertified
          }
        }

        return addr
      })
    }

    const filteredAddrs = resolvedAddresses.filter(addr => {
      // filter out any multiaddrs that we do not have transports for
      if (this.components.transportManager.transportForMultiaddr(addr.multiaddr) == null) {
        return false
      }

      // if the resolved multiaddr has a PeerID but it's the wrong one, ignore it
      // - this can happen with addresses like bootstrap.libp2p.io that resolve
      // to multiple different peers
      const addrPeerId = addr.multiaddr.getPeerId()
      if (peerId != null && addrPeerId != null) {
        return peerId.equals(addrPeerId)
      }

      return true
    })

    // deduplicate addresses
    const dedupedAddrs = new Map<string, Address>()

    for (const addr of filteredAddrs) {
      const maStr = addr.multiaddr.toString()
      const existing = dedupedAddrs.get(maStr)

      if (existing != null) {
        existing.isCertified = existing.isCertified || addr.isCertified || false
        continue
      }

      dedupedAddrs.set(maStr, addr)
    }

    const dedupedMultiaddrs = [...dedupedAddrs.values()]

    // make sure we actually have some addresses to dial
    if (dedupedMultiaddrs.length === 0) {
      throw new CodeError('The dial request has no valid addresses', codes.ERR_NO_VALID_ADDRESSES)
    }

    const gatedAdrs: Address[] = []

    for (const addr of dedupedMultiaddrs) {
      if (this.components.connectionGater.denyDialMultiaddr != null && await this.components.connectionGater.denyDialMultiaddr(addr.multiaddr)) {
        continue
      }

      gatedAdrs.push(addr)
    }

    const sortedGatedAddrs = gatedAdrs.sort(this.addressSorter)

    // make sure we actually have some addresses to dial
    if (sortedGatedAddrs.length === 0) {
      throw new CodeError('The connection gater denied all addresses in the dial request', codes.ERR_NO_VALID_ADDRESSES)
    }

    this.log.trace('addresses for %p before filtering', peerId ?? 'unknown peer', resolvedAddresses.map(({ multiaddr }) => multiaddr.toString()))
    this.log.trace('addresses for %p after filtering', peerId ?? 'unknown peer', sortedGatedAddrs.map(({ multiaddr }) => multiaddr.toString()))

    return sortedGatedAddrs
  }

  async isDialable (multiaddr: Multiaddr | Multiaddr[], options: IsDialableOptions = {}): Promise<boolean> {
    if (!Array.isArray(multiaddr)) {
      multiaddr = [multiaddr]
    }

    try {
      const addresses = await this.calculateMultiaddrs(undefined, new Set(multiaddr.map(ma => ma.toString())), options)

      if (options.runOnTransientConnection === false) {
        // return true if any resolved multiaddrs are not relay addresses
        return addresses.find(addr => {
          return !Circuit.matches(addr.multiaddr)
        }) != null
      }

      return true
    } catch (err) {
      this.log.trace('error calculating if multiaddr(s) were dialable', err)
    }

    return false
  }
}
