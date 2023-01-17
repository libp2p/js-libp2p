import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { isMultiaddr, Multiaddr, Resolver, multiaddr, resolvers } from '@multiformats/multiaddr'
import { TimeoutController } from 'timeout-abort-controller'
import { anySignal } from 'any-signal'
import { setMaxListeners } from 'events'
import { DialAction, DialRequest } from './dial-request.js'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { trackedMap } from '@libp2p/tracked-map'
import { codes } from '../../errors.js'
import {
  DIAL_TIMEOUT,
  MAX_PARALLEL_DIALS,
  MAX_PER_PEER_DIALS,
  MAX_ADDRS_TO_DIAL
} from '../../constants.js'
import type { Connection, ConnectionGater } from '@libp2p/interface-connection'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Startable } from '@libp2p/interfaces/startable'
import { isPeerId, PeerId } from '@libp2p/interface-peer-id'
import { getPeerAddress } from '../../get-peer.js'
import type { AddressSorter, PeerStore } from '@libp2p/interface-peer-store'
import type { Metrics } from '@libp2p/interface-metrics'
import type { Dialer } from '@libp2p/interface-connection-manager'
import type { TransportManager } from '@libp2p/interface-transport'

const log = logger('libp2p:dialer')

export interface DialTarget {
  id: string
  addrs: Multiaddr[]
}

export interface PendingDial {
  dialRequest: DialRequest
  controller: TimeoutController
  promise: Promise<Connection>
  destroy: () => void
}

export interface PendingDialTarget {
  resolve: (value: any) => void
  reject: (err: Error) => void
}

export interface DialerInit {
  /**
   * Sort the known addresses of a peer before trying to dial
   */
  addressSorter?: AddressSorter

  /**
   * Number of max concurrent dials
   */
  maxParallelDials?: number

  /**
   * Number of max addresses to dial for a given peer
   */
  maxAddrsToDial?: number

  /**
   * How long a dial attempt is allowed to take
   */
  dialTimeout?: number

  /**
   * Number of max concurrent dials per peer
   */
  maxDialsPerPeer?: number

  /**
   * Multiaddr resolvers to use when dialing
   */
  resolvers?: Record<string, Resolver>
}

export interface DefaultDialerComponents {
  peerId: PeerId
  metrics?: Metrics
  peerStore: PeerStore
  transportManager: TransportManager
  connectionGater: ConnectionGater
}

export class DefaultDialer implements Startable, Dialer {
  private readonly components: DefaultDialerComponents
  private readonly addressSorter: AddressSorter
  private readonly maxAddrsToDial: number
  private readonly timeout: number
  private readonly maxDialsPerPeer: number
  public tokens: number[]
  public pendingDials: Map<string, PendingDial>
  public pendingDialTargets: Map<string, AbortController>
  private started: boolean

  constructor (components: DefaultDialerComponents, init: DialerInit = {}) {
    this.started = false
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxAddrsToDial = init.maxAddrsToDial ?? MAX_ADDRS_TO_DIAL
    this.timeout = init.dialTimeout ?? DIAL_TIMEOUT
    this.maxDialsPerPeer = init.maxDialsPerPeer ?? MAX_PER_PEER_DIALS
    this.tokens = [...new Array(init.maxParallelDials ?? MAX_PARALLEL_DIALS)].map((_, index) => index)
    this.components = components
    this.pendingDials = trackedMap({
      name: 'libp2p_dialler_pending_dials',
      metrics: components.metrics
    })
    this.pendingDialTargets = trackedMap({
      name: 'libp2p_dialler_pending_dial_targets',
      metrics: components.metrics
    })

    for (const [key, value] of Object.entries(init.resolvers ?? {})) {
      resolvers.set(key, value)
    }
  }

  isStarted () {
    return this.started
  }

  async start () {
    this.started = true
  }

  /**
   * Clears any pending dials
   */
  async stop () {
    this.started = false

    for (const dial of this.pendingDials.values()) {
      try {
        dial.controller.abort()
      } catch (err: any) {
        log.error(err)
      }
    }
    this.pendingDials.clear()

    for (const pendingTarget of this.pendingDialTargets.values()) {
      pendingTarget.abort()
    }
    this.pendingDialTargets.clear()
  }

  /**
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   */
  async dial (peerIdOrMultiaddr: PeerId | Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    const { peerId, multiaddr } = getPeerAddress(peerIdOrMultiaddr)

    if (peerId != null) {
      if (this.components.peerId.equals(peerId)) {
        throw errCode(new Error('Tried to dial self'), codes.ERR_DIALED_SELF)
      }

      if (multiaddr != null) {
        log('storing multiaddrs %p', peerId, multiaddr)
        await this.components.peerStore.addressBook.add(peerId, [multiaddr])
      }

      if (await this.components.connectionGater.denyDialPeer(peerId)) {
        throw errCode(new Error('The dial request is blocked by gater.allowDialPeer'), codes.ERR_PEER_DIAL_INTERCEPTED)
      }
    }

    log('creating dial target for %p', peerId)

    // resolving multiaddrs can involve dns lookups so allow them to be aborted
    const controller = new AbortController()
    const controllerId = randomId()
    this.pendingDialTargets.set(controllerId, controller)
    let signal = controller.signal

    // merge with the passed signal, if any
    if (options.signal != null) {
      signal = anySignal([signal, options.signal])
    }

    let dialTarget: DialTarget

    try {
      dialTarget = await this._createDialTarget({ peerId, multiaddr }, {
        ...options,
        signal
      })
    } finally {
      // done resolving the multiaddrs so remove the abort controller
      this.pendingDialTargets.delete(controllerId)
    }

    if (dialTarget.addrs.length === 0) {
      throw errCode(new Error('The dial request has no valid addresses'), codes.ERR_NO_VALID_ADDRESSES)
    }

    // try to join an in-flight dial for this peer if one is available
    const pendingDial = this.pendingDials.get(dialTarget.id) ?? this._createPendingDial(dialTarget, options)

    try {
      const connection = await pendingDial.promise
      log('dial succeeded to %s', dialTarget.id)
      return connection
    } catch (err: any) {
      log('dial failed to %s', dialTarget.id, err)
      // Error is a timeout
      if (pendingDial.controller.signal.aborted) {
        err.code = codes.ERR_TIMEOUT
      }
      log.error(err)
      throw err
    } finally {
      pendingDial.destroy()
    }
  }

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   *
   * If a multiaddr is received it should be the only address attempted.
   *
   * Multiaddrs not supported by the available transports will be filtered out.
   */
  async _createDialTarget (peerIdOrMultiaddr: { peerId?: PeerId, multiaddr?: Multiaddr }, options: AbortOptions): Promise<DialTarget> {
    let addrs: Multiaddr[] = []

    if (isMultiaddr(peerIdOrMultiaddr.multiaddr)) {
      addrs.push(peerIdOrMultiaddr.multiaddr)
    }

    // only load addresses if a peer id was passed, otherwise only dial the passed multiaddr
    if (!isMultiaddr(peerIdOrMultiaddr.multiaddr) && isPeerId(peerIdOrMultiaddr.peerId)) {
      addrs.push(...await this._loadAddresses(peerIdOrMultiaddr.peerId))
    }

    addrs = (await Promise.all(
      addrs.map(async (ma) => await this._resolve(ma, options))
    ))
      .flat()
      // Multiaddrs not supported by the available transports will be filtered out.
      .filter(ma => Boolean(this.components.transportManager.transportForMultiaddr(ma)))

    // deduplicate addresses
    addrs = [...new Set(addrs.map(ma => ma.toString()))].map(ma => multiaddr(ma))

    if (addrs.length > this.maxAddrsToDial) {
      throw errCode(new Error('dial with more addresses than allowed'), codes.ERR_TOO_MANY_ADDRESSES)
    }

    const peerId = isPeerId(peerIdOrMultiaddr.peerId) ? peerIdOrMultiaddr.peerId : undefined

    if (peerId != null) {
      const peerIdMultiaddr = `/p2p/${peerId.toString()}`
      addrs = addrs.map(addr => {
        const addressPeerId = addr.getPeerId()

        if (addressPeerId == null || !peerId.equals(addressPeerId)) {
          return addr.encapsulate(peerIdMultiaddr)
        }

        return addr
      })
    }

    return {
      id: peerId == null ? randomId() : peerId.toString(),
      addrs
    }
  }

  /**
   * Loads a list of addresses from the peer store for the passed peer id
   */
  async _loadAddresses (peer: PeerId): Promise<Multiaddr[]> {
    const addresses = await this.components.peerStore.addressBook.get(peer)

    return (await Promise.all(
      addresses.map(async address => {
        const deny = await this.components.connectionGater.denyDialMultiaddr(peer, address.multiaddr)

        if (deny) {
          return false
        }

        return address
      })
    ))
      .filter(isTruthy)
      // Sort addresses so, for example, we try certified public address first
      .sort(this.addressSorter)
      .map(address => address.multiaddr)
  }

  /**
   * Creates a PendingDial that wraps the underlying DialRequest
   */
  _createPendingDial (dialTarget: DialTarget, options: AbortOptions = {}): PendingDial {
    /**
     * @param {Multiaddr} addr
     * @param {{ signal: { aborted: any; }; }} options
     */
    const dialAction: DialAction = async (addr, options = {}) => {
      if (options.signal?.aborted === true) {
        throw errCode(new Error('already aborted'), codes.ERR_ALREADY_ABORTED)
      }

      return await this.components.transportManager.dial(addr, options).catch(err => {
        log.error('dial to %s failed', addr, err)
        throw err
      })
    }

    const dialRequest = new DialRequest({
      addrs: dialTarget.addrs,
      dialAction,
      dialer: this
    })

    // Combine the timeout signal and options.signal, if provided
    const timeoutController = new TimeoutController(this.timeout)

    const signals = [timeoutController.signal]
    ;(options.signal != null) && signals.push(options.signal)
    const signal = anySignal(signals)

    // this signal will potentially be used while dialing lots of
    // peers so prevent MaxListenersExceededWarning appearing in the console
    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, signal)
    } catch {}

    const pendingDial = {
      dialRequest,
      controller: timeoutController,
      promise: dialRequest.run({ ...options, signal }),
      destroy: () => {
        timeoutController.clear()
        this.pendingDials.delete(dialTarget.id)
      }
    }
    this.pendingDials.set(dialTarget.id, pendingDial)

    return pendingDial
  }

  getTokens (num: number) {
    const total = Math.min(num, this.maxDialsPerPeer, this.tokens.length)
    const tokens = this.tokens.splice(0, total)
    log('%d tokens request, returning %d, %d remaining', num, total, this.tokens.length)
    return tokens
  }

  releaseToken (token: number) {
    // Guard against duplicate releases
    if (this.tokens.includes(token)) {
      return
    }

    log('token %d released', token)
    this.tokens.push(token)
  }

  /**
   * Resolve multiaddr recursively
   */
  async _resolve (ma: Multiaddr, options: AbortOptions): Promise<Multiaddr[]> {
    // TODO: recursive logic should live in multiaddr once dns4/dns6 support is in place
    // Now only supporting resolve for dnsaddr
    const resolvableProto = ma.protoNames().includes('dnsaddr')

    // Multiaddr is not resolvable? End recursion!
    if (!resolvableProto) {
      return [ma]
    }

    const resolvedMultiaddrs = await this._resolveRecord(ma, options)
    const recursiveMultiaddrs = await Promise.all(resolvedMultiaddrs.map(async (nm) => {
      return await this._resolve(nm, options)
    }))

    const addrs = recursiveMultiaddrs.flat()
    return addrs.reduce<Multiaddr[]>((array, newM) => {
      if (array.find(m => m.equals(newM)) == null) {
        array.push(newM)
      }
      return array
    }, ([]))
  }

  /**
   * Resolve a given multiaddr. If this fails, an empty array will be returned
   */
  async _resolveRecord (ma: Multiaddr, options: AbortOptions): Promise<Multiaddr[]> {
    try {
      ma = multiaddr(ma.toString()) // Use current multiaddr module
      const multiaddrs = await ma.resolve(options)
      return multiaddrs
    } catch (err) {
      log.error(`multiaddr ${ma.toString()} could not be resolved`, err)
      return []
    }
  }
}

/**
 * Type safe version of `list.filter(Boolean)`
 */
function isTruthy <T> (e: T | false | null | undefined): e is T {
  return Boolean(e)
}

/**
 * Returns a random string
 */
function randomId (): string {
  return `${(parseInt(String(Math.random() * 1e9), 10)).toString()}${Date.now()}`
}
