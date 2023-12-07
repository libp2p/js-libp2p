import { AbortError, CodeError, ERR_TIMEOUT, setMaxListeners } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { defaultAddressSort } from '@libp2p/utils/address-sort'
import { type Multiaddr, type Resolver, resolvers } from '@multiformats/multiaddr'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import { type ClearableSignal, anySignal } from 'any-signal'
import pDefer from 'p-defer'
import PQueue from 'p-queue'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { codes } from '../errors.js'
import { getPeerAddress } from '../get-peer.js'
import {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PEER_ADDRS_TO_DIAL,
  LAST_DIAL_FAILURE_KEY
} from './constants.js'
import { combineSignals, resolveMultiaddrs } from './utils.js'
import type { AddressSorter, AbortOptions, PendingDial, ComponentLogger, Logger, Connection, ConnectionGater, Metric, Metrics, PeerId, Address, PeerStore } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

export interface PendingDialTarget {
  resolve(value: any): void
  reject(err: Error): void
}

export interface DialOptions extends AbortOptions {
  priority?: number
  force?: boolean
}

interface PendingDialInternal extends PendingDial {
  promise: Promise<Connection>
}

interface DialerInit {
  addressSorter?: AddressSorter
  maxParallelDials?: number
  maxPeerAddrsToDial?: number
  dialTimeout?: number
  resolvers?: Record<string, Resolver>
  connections?: PeerMap<Connection[]>
}

const defaultOptions = {
  addressSorter: defaultAddressSort,
  maxParallelDials: MAX_PARALLEL_DIALS,
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
  transportManager: TransportManager
  connectionGater: ConnectionGater
  logger: ComponentLogger
}

export class DialQueue {
  public pendingDials: PendingDialInternal[]
  public queue: PQueue
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly connectionGater: ConnectionGater
  private readonly transportManager: TransportManager
  private readonly addressSorter: AddressSorter
  private readonly maxPeerAddrsToDial: number
  private readonly dialTimeout: number
  private readonly inProgressDialCount?: Metric
  private readonly pendingDialCount?: Metric
  private readonly shutDownController: AbortController
  private readonly connections: PeerMap<Connection[]>
  private readonly log: Logger

  constructor (components: DialQueueComponents, init: DialerInit = {}) {
    this.addressSorter = init.addressSorter ?? defaultOptions.addressSorter
    this.maxPeerAddrsToDial = init.maxPeerAddrsToDial ?? defaultOptions.maxPeerAddrsToDial
    this.dialTimeout = init.dialTimeout ?? defaultOptions.dialTimeout
    this.connections = init.connections ?? new PeerMap()
    this.log = components.logger.forComponent('libp2p:connection-manager:dial-queue')

    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.connectionGater = components.connectionGater
    this.transportManager = components.transportManager
    this.shutDownController = new AbortController()

    setMaxListeners(Infinity, this.shutDownController.signal)

    this.pendingDialCount = components.metrics?.registerMetric('libp2p_dial_queue_pending_dials')
    this.inProgressDialCount = components.metrics?.registerMetric('libp2p_dial_queue_in_progress_dials')
    this.pendingDials = []

    for (const [key, value] of Object.entries(init.resolvers ?? {})) {
      resolvers.set(key, value)
    }

    // controls dial concurrency
    this.queue = new PQueue({
      concurrency: init.maxParallelDials ?? defaultOptions.maxParallelDials
    })

    // a job was added to the queue
    this.queue.on('add', () => {
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
    // a queued job started
    this.queue.on('active', () => {
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
    // a started job completed without error
    this.queue.on('completed', () => {
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
    // a started job errored
    this.queue.on('error', (err) => {
      this.log.error('error in dial queue', err)
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
    // all queued jobs have been started
    this.queue.on('empty', () => {
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
    // add started jobs have run and the queue is empty
    this.queue.on('idle', () => {
      this.pendingDialCount?.update(this.queue.size)
      this.inProgressDialCount?.update(this.queue.pending)
    })
  }

  /**
   * Clears any pending dials
   */
  stop (): void {
    this.shutDownController.abort()
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
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used, all other dials will be aborted when that happens.
   */
  async dial (peerIdOrMultiaddr: PeerId | Multiaddr | Multiaddr[], options: DialOptions = {}): Promise<Connection> {
    const { peerId, multiaddrs } = getPeerAddress(peerIdOrMultiaddr)

    const addrs: Address[] = multiaddrs.map(multiaddr => ({
      multiaddr,
      isCertified: false
    }))

    // create abort conditions - need to do this before `calculateMultiaddrs` as we may be about to
    // resolve a dns addr which can time out
    const signal = this.createDialAbortControllers(options.signal)
    let addrsToDial: Address[]

    try {
      // load addresses from address book, resolve and dnsaddrs, filter undiallables, add peer IDs, etc
      addrsToDial = await this.calculateMultiaddrs(peerId, addrs, {
        ...options,
        signal
      })
    } catch (err) {
      signal.clear()
      throw err
    }

    // make sure we don't have an existing connection to any of the addresses we
    // are about to dial
    let existingConnection = Array.from(this.connections.values()).flat().find(conn => {
      if (options.force === true) {
        return false
      }

      return addrsToDial.find(addr => {
        return addr.multiaddr.equals(conn.remoteAddr)
      })
    })

    if (existingConnection != null) {
      this.log('already connected to %a', existingConnection.remoteAddr)
      return existingConnection
    }

    // ready to dial, all async work finished - make sure we don't have any
    // pending dials in progress for this peer or set of multiaddrs
    const existingDial = this.pendingDials.find(dial => {
      // is the dial for the same peer id?
      if (dial.peerId != null && peerId != null && dial.peerId.equals(peerId)) {
        return true
      }

      // is the dial for the same set of multiaddrs?
      if (addrsToDial.map(({ multiaddr }) => multiaddr.toString()).join() === dial.multiaddrs.map(multiaddr => multiaddr.toString()).join()) {
        return true
      }

      return false
    })

    if (existingDial != null) {
      this.log('joining existing dial target for %p', peerId)
      signal.clear()
      return existingDial.promise
    }

    this.log('creating dial target for', addrsToDial.map(({ multiaddr }) => multiaddr.toString()))
    // @ts-expect-error .promise property is set below
    const pendingDial: PendingDialInternal = {
      id: randomId(),
      status: 'queued',
      peerId,
      multiaddrs: addrsToDial.map(({ multiaddr }) => multiaddr)
    }

    pendingDial.promise = this.performDial(pendingDial, {
      ...options,
      signal
    })
      .finally(() => {
        // remove our pending dial entry
        this.pendingDials = this.pendingDials.filter(p => p.id !== pendingDial.id)

        // clean up abort signals/controllers
        signal.clear()
      })
      .catch(async err => {
        this.log.error('dial failed to %s', pendingDial.multiaddrs.map(ma => ma.toString()).join(', '), err)

        if (peerId != null) {
          // record the last failed dial
          try {
            await this.peerStore.patch(peerId, {
              metadata: {
                [LAST_DIAL_FAILURE_KEY]: uint8ArrayFromString(Date.now().toString())
              }
            })
          } catch (err: any) {
            this.log.error('could not update last dial failure key for %p', peerId, err)
          }
        }

        // Error is a timeout
        if (signal.aborted) {
          const error = new CodeError(err.message, ERR_TIMEOUT)
          throw error
        }

        throw err
      })

    // let other dials join this one
    this.pendingDials.push(pendingDial)

    const connection = await pendingDial.promise

    // we may have been dialing a multiaddr without a peer id attached but by
    // this point we have upgraded the connection so the remote peer information
    // should be available - check again that we don't already have a connection
    // to the remote multiaddr
    existingConnection = Array.from(this.connections.values()).flat().find(conn => {
      if (options.force === true) {
        return false
      }

      return conn.id !== connection.id && conn.remoteAddr.equals(connection.remoteAddr)
    })

    if (existingConnection != null) {
      this.log('already connected to %a', existingConnection.remoteAddr)
      await connection.close()
      return existingConnection
    }

    this.log('connection opened to %a', connection.remoteAddr)
    return connection
  }

  private createDialAbortControllers (userSignal?: AbortSignal): ClearableSignal {
    // let any signal abort the dial
    const signal = anySignal(
      [AbortSignal.timeout(this.dialTimeout),
        this.shutDownController.signal,
        userSignal
      ]
    )

    try {
      // This emitter gets listened to a lot
      setMaxListeners?.(Infinity, signal)
    } catch {}

    return signal
  }

  // eslint-disable-next-line complexity
  private async calculateMultiaddrs (peerId?: PeerId, addrs: Address[] = [], options: DialOptions = {}): Promise<Address[]> {
    // if a peer id or multiaddr(s) with a peer id, make sure it isn't our peer id and that we are allowed to dial it
    if (peerId != null) {
      if (this.peerId.equals(peerId)) {
        throw new CodeError('Tried to dial self', codes.ERR_DIALED_SELF)
      }

      if ((await this.connectionGater.denyDialPeer?.(peerId)) === true) {
        throw new CodeError('The dial request is blocked by gater.allowDialPeer', codes.ERR_PEER_DIAL_INTERCEPTED)
      }

      // if just a peer id was passed, load available multiaddrs for this peer from the address book
      if (addrs.length === 0) {
        this.log('loading multiaddrs for %p', peerId)
        try {
          const peer = await this.peerStore.get(peerId)
          addrs.push(...peer.addresses)
          this.log('loaded multiaddrs for %p', peerId, addrs.map(({ multiaddr }) => multiaddr.toString()))
        } catch (err: any) {
          if (err.code !== codes.ERR_NOT_FOUND) {
            throw err
          }
        }
      }
    }

    // resolve addresses - this can result in a one-to-many translation when dnsaddrs are resolved
    let resolvedAddresses = (await Promise.all(
      addrs.map(async addr => {
        const result = await resolveMultiaddrs(addr.multiaddr, {
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
      if (this.transportManager.transportForMultiaddr(addr.multiaddr) == null) {
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

    if (dedupedMultiaddrs.length === 0 || dedupedMultiaddrs.length > this.maxPeerAddrsToDial) {
      this.log('addresses for %p before filtering', peerId ?? 'unknown peer', resolvedAddresses.map(({ multiaddr }) => multiaddr.toString()))
      this.log('addresses for %p after filtering', peerId ?? 'unknown peer', dedupedMultiaddrs.map(({ multiaddr }) => multiaddr.toString()))
    }

    // make sure we actually have some addresses to dial
    if (dedupedMultiaddrs.length === 0) {
      throw new CodeError('The dial request has no valid addresses', codes.ERR_NO_VALID_ADDRESSES)
    }

    // make sure we don't have too many addresses to dial
    if (dedupedMultiaddrs.length > this.maxPeerAddrsToDial) {
      throw new CodeError('dial with more addresses than allowed', codes.ERR_TOO_MANY_ADDRESSES)
    }

    const gatedAdrs: Address[] = []

    for (const addr of dedupedMultiaddrs) {
      if (this.connectionGater.denyDialMultiaddr != null && await this.connectionGater.denyDialMultiaddr(addr.multiaddr)) {
        continue
      }

      gatedAdrs.push(addr)
    }

    const sortedGatedAddrs = gatedAdrs.sort(this.addressSorter)

    // make sure we actually have some addresses to dial
    if (sortedGatedAddrs.length === 0) {
      throw new CodeError('The connection gater denied all addresses in the dial request', codes.ERR_NO_VALID_ADDRESSES)
    }

    return sortedGatedAddrs
  }

  private async performDial (pendingDial: PendingDialInternal, options: DialOptions = {}): Promise<Connection> {
    const dialAbortControllers: Array<(AbortController | undefined)> = pendingDial.multiaddrs.map(() => new AbortController())

    try {
      // internal peer dial queue - only one dial per peer at a time
      const peerDialQueue = new PQueue({ concurrency: 1 })
      peerDialQueue.on('error', (err) => {
        this.log.error('error dialing %s %o', pendingDial.multiaddrs, err)
      })

      const conn = await Promise.any(pendingDial.multiaddrs.map(async (addr, i) => {
        const controller = dialAbortControllers[i]

        if (controller == null) {
          throw new CodeError('dialAction did not come with an AbortController', codes.ERR_INVALID_PARAMETERS)
        }

        // let any signal abort the dial
        const signal = combineSignals(controller.signal, options.signal)
        signal.addEventListener('abort', () => {
          this.log('dial to %a aborted', addr)
        })
        const deferred = pDefer<Connection>()

        await peerDialQueue.add(async () => {
          if (signal.aborted) {
            this.log('dial to %a was aborted before reaching the head of the peer dial queue', addr)
            deferred.reject(new AbortError())
            return
          }

          // add the individual dial to the dial queue so we don't breach maxConcurrentDials
          await this.queue.add(async () => {
            try {
              if (signal.aborted) {
                this.log('dial to %a was aborted before reaching the head of the dial queue', addr)
                deferred.reject(new AbortError())
                return
              }

              // update dial status
              pendingDial.status = 'active'

              const conn = await this.transportManager.dial(addr, {
                ...options,
                signal
              })

              if (controller.signal.aborted) {
                // another dial succeeded faster than this one
                this.log('multiple dials succeeded, closing superfluous connection')

                conn.close().catch(err => {
                  this.log.error('error closing superfluous connection', err)
                })

                deferred.reject(new AbortError())
                return
              }

              // remove the successful AbortController so it is not aborted
              dialAbortControllers[i] = undefined

              // immediately abort any other dials
              dialAbortControllers.forEach(c => {
                if (c !== undefined) {
                  c.abort()
                }
              })

              this.log('dial to %a succeeded', addr)

              // resolve the connection promise
              deferred.resolve(conn)
            } catch (err: any) {
              // something only went wrong if our signal was not aborted
              this.log.error('error during dial of %a', addr, err)
              deferred.reject(err)
            }
          }, {
            ...options,
            signal
          }).catch(err => {
            deferred.reject(err)
          })
        }, {
          signal
        }).catch(err => {
          deferred.reject(err)
        }).finally(() => {
          signal.clear()
        })

        return deferred.promise
      }))

      // dial succeeded or failed
      if (conn == null) {
        throw new CodeError('successful dial led to empty object returned from peer dial queue', codes.ERR_TRANSPORT_DIAL_FAILED)
      }

      pendingDial.status = 'success'

      return conn
    } catch (err: any) {
      pendingDial.status = 'error'

      // if we only dialled one address, unwrap the AggregateError to provide more
      // useful feedback to the user
      if (pendingDial.multiaddrs.length === 1 && err.name === 'AggregateError') {
        throw err.errors[0]
      }

      throw err
    }
  }
}

/**
 * Returns a random string
 */
function randomId (): string {
  return `${(parseInt(String(Math.random() * 1e9), 10)).toString()}${Date.now()}`
}
