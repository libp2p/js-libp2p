import { logger } from '@libp2p/logger'
import { AbortError, CodeError } from '@libp2p/interfaces/errors'
import { Multiaddr, Resolver, resolvers } from '@multiformats/multiaddr'
import { TimeoutController } from 'timeout-abort-controller'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { codes } from '../errors.js'
import {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS_PER_PEER,
  MAX_PARALLEL_DIALS,
  MAX_PEER_ADDRS_TO_DIAL
} from './constants.js'
import type { Connection } from '@libp2p/interface-connection'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerId } from '@libp2p/interface-peer-id'
import { getPeerAddress } from '../get-peer.js'
import type { Address, AddressSorter, PeerStore } from '@libp2p/interface-peer-store'
import type { Metric, Metrics } from '@libp2p/interface-metrics'
import type { TransportManager } from '@libp2p/interface-transport'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import PQueue from 'p-queue'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import { combineSignals, resolveMultiaddrs } from './utils.js'
import pDefer from 'p-defer'
import type { ClearableSignal } from 'any-signal'

const log = logger('libp2p:connection-manager:dial-queue')

export type PendingDialStatus = 'queued' | 'active' | 'error' | 'success'

export interface PendingDial {
  id: string
  status: PendingDialStatus
  peerId?: PeerId
  multiaddrs: Multiaddr[]
  promise: Promise<Connection>
}

export interface PendingDialTarget {
  resolve: (value: any) => void
  reject: (err: Error) => void
}

export interface DialOptions extends AbortOptions {
  priority?: number
}

interface DialerInit {
  addressSorter?: AddressSorter
  maxParallelDials?: number
  maxPeerAddrsToDial?: number
  maxParallelDialsPerPeer?: number
  dialTimeout?: number
  resolvers?: Record<string, Resolver>
}

const defaultOptions = {
  addressSorter: publicAddressesFirst,
  maxParallelDials: MAX_PARALLEL_DIALS,
  maxPeerAddrsToDial: MAX_PEER_ADDRS_TO_DIAL,
  maxParallelDialsPerPeer: MAX_PARALLEL_DIALS_PER_PEER,
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
}

export class DialQueue {
  public pendingDials: PendingDial[]
  public queue: PQueue
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly connectionGater: ConnectionGater
  private readonly transportManager: TransportManager
  private readonly addressSorter: AddressSorter
  private readonly maxPeerAddrsToDial: number
  private readonly maxParallelDialsPerPeer: number
  private readonly dialTimeout: number
  private readonly inProgressDialCount?: Metric
  private readonly pendingDialCount?: Metric
  private readonly shutDownController: AbortController

  constructor (components: DialQueueComponents, init: DialerInit = {}) {
    this.addressSorter = init.addressSorter ?? defaultOptions.addressSorter
    this.maxPeerAddrsToDial = init.maxPeerAddrsToDial ?? defaultOptions.maxPeerAddrsToDial
    this.maxParallelDialsPerPeer = init.maxParallelDialsPerPeer ?? defaultOptions.maxParallelDialsPerPeer
    this.dialTimeout = init.dialTimeout ?? defaultOptions.dialTimeout

    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.connectionGater = components.connectionGater
    this.transportManager = components.transportManager
    this.shutDownController = new AbortController()

    this.pendingDialCount = components.metrics?.registerMetric('libp2p_dialler_pending_dials')
    this.inProgressDialCount = components.metrics?.registerMetric('libp2p_dialler_in_progress_dials')
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
      log.error('error in dial queue', err)
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
    const { timeoutController, signal } = this.createDialAbortControllers(options.signal)
    let addrsToDial: Address[]

    try {
      // load addresses from address book, resolve and dnsaddrs, filter undiallables, add peer IDs, etc
      addrsToDial = await this.calculateMultiaddrs(peerId, addrs, {
        ...options,
        signal
      })
    } catch (err) {
      signal.clear()
      timeoutController.clear()
      throw err
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
      log('joining existing dial target for %p', peerId)
      signal.clear()
      timeoutController.clear()
      return await existingDial.promise
    }

    log('creating dial target for', addrsToDial.map(({ multiaddr }) => multiaddr.toString()))
    // @ts-expect-error .promise property is set below
    const pendingDial: PendingDial = {
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
        timeoutController.clear()
      })
      .catch(err => {
        log.error('dial failed to %s', addrsToDial.map(({ multiaddr }) => multiaddr.toString()).join(', '), err)

        // Error is a timeout
        if (timeoutController.signal.aborted) {
          const error = new CodeError(err.message, codes.ERR_TIMEOUT)
          throw error
        }

        throw err
      })

    // let other dials join this one
    this.pendingDials.push(pendingDial)

    return await pendingDial.promise
  }

  private createDialAbortControllers (userSignal?: AbortSignal): { timeoutController: TimeoutController, signal: ClearableSignal } {
    // ensure we throw if the dial takes longer than the dial timeout
    const timeoutController = new TimeoutController(this.dialTimeout)

    // let any signal abort the dial
    const signal = combineSignals(
      timeoutController.signal,
      this.shutDownController.signal,
      userSignal
    )

    return { timeoutController, signal }
  }

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
        log('loading multiaddrs for %p', peerId)
        addrs.push(...(await this.peerStore.addressBook.get(peerId)))
        log('loaded multiaddrs for %p', peerId, addrs.map(({ multiaddr }) => multiaddr.toString()))
      }
    }

    // resolve addresses - this can result in a one-to-many translation when dnsaddrs are resolved
    const resolvedAddresses = (await Promise.all(
      addrs.map(async addr => {
        const result = await resolveMultiaddrs(addr.multiaddr, options)

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

    // filter out any multiaddrs that we do not have transports for
    const filteredAddrs = resolvedAddresses.filter(addr => Boolean(this.transportManager.transportForMultiaddr(addr.multiaddr)))

    // deduplicate addresses
    const dedupedAddrs: Map<string, Address> = new Map()

    for (const addr of filteredAddrs) {
      const maStr = addr.multiaddr.toString()
      const existing = dedupedAddrs.get(maStr)

      if (existing != null) {
        existing.isCertified = existing.isCertified || addr.isCertified || false
        continue
      }

      dedupedAddrs.set(maStr, addr)
    }

    let dedupedMultiaddrs = [...dedupedAddrs.values()]

    if (dedupedMultiaddrs.length === 0 || dedupedMultiaddrs.length > this.maxPeerAddrsToDial) {
      log('addresses for %p before filtering', peerId ?? 'unknown peer', resolvedAddresses.map(({ multiaddr }) => multiaddr.toString()))
      log('addresses for %p after filtering', peerId ?? 'unknown peer', dedupedMultiaddrs.map(({ multiaddr }) => multiaddr.toString()))
    }

    // make sure we actually have some addresses to dial
    if (dedupedMultiaddrs.length === 0) {
      throw new CodeError('The dial request has no valid addresses', codes.ERR_NO_VALID_ADDRESSES)
    }

    // make sure we don't have too many addresses to dial
    if (dedupedMultiaddrs.length > this.maxPeerAddrsToDial) {
      throw new CodeError('dial with more addresses than allowed', codes.ERR_TOO_MANY_ADDRESSES)
    }

    // append peer id to multiaddrs if it is not already present
    if (peerId != null) {
      const peerIdMultiaddr = `/p2p/${peerId.toString()}`
      dedupedMultiaddrs = dedupedMultiaddrs.map(addr => {
        const addressPeerId = addr.multiaddr.getPeerId()
        const lastProto = addr.multiaddr.protos().pop()

        // do not append peer id to path multiaddrs
        if (lastProto?.path === true) {
          return addr
        }

        if (addressPeerId == null) {
          return {
            multiaddr: addr.multiaddr.encapsulate(peerIdMultiaddr),
            isCertified: addr.isCertified
          }
        }

        return addr
      })
    }

    const gatedAdrs: Address[] = []

    for (const addr of dedupedMultiaddrs) {
      // @ts-expect-error needs updating in the interface
      if (this.connectionGater.denyDialMultiaddr != null && await this.connectionGater.denyDialMultiaddr(addr.multiaddr)) {
        continue
      }

      gatedAdrs.push(addr)
    }

    return gatedAdrs.sort(this.addressSorter)
  }

  private async performDial (pendingDial: PendingDial, options: DialOptions = {}): Promise<Connection> {
    const dialAbortControllers: Array<(AbortController | undefined)> = pendingDial.multiaddrs.map(() => new AbortController())

    try {
      // internal peer dial queue to ensure we only dial the configured number of addresses
      // per peer at the same time to prevent one peer with a lot of addresses swamping
      // the dial queue
      const peerDialQueue = new PQueue({
        concurrency: this.maxParallelDialsPerPeer
      })
      peerDialQueue.on('error', (err) => {
        log.error('error dialling', err)
      })

      const conn = await Promise.any(pendingDial.multiaddrs.map(async (addr, i) => {
        const controller = dialAbortControllers[i]

        if (controller == null) {
          throw new CodeError('dialAction did not come with an AbortController', codes.ERR_INVALID_PARAMETERS)
        }

        // let any signal abort the dial
        const signal = combineSignals(controller.signal, options.signal)
        signal.addEventListener('abort', () => {
          log('dial to %s aborted', addr)
        })
        const deferred = pDefer<Connection>()

        await peerDialQueue.add(async () => {
          if (signal.aborted) {
            log('dial to %s was aborted before reaching the head of the peer dial queue', addr)
            deferred.reject(new AbortError())
            return
          }

          // add the individual dial to the dial queue so we don't breach maxConcurrentDials
          await this.queue.add(async () => {
            try {
              if (signal.aborted) {
                log('dial to %s was aborted before reaching the head of the dial queue', addr)
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
                log('multiple dials succeeded, closing superfluous connection')

                conn.close().catch(err => {
                  log.error('error closing superfluous connection', err)
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

              log('dial to %s succeeded', addr)

              // resolve the connection promise
              deferred.resolve(conn)
            } catch (err: any) {
              // something only went wrong if our signal was not aborted
              log.error('error during dial of %s', addr, err)
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

        return await deferred.promise
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
