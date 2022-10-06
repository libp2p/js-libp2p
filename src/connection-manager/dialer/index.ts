import { logger } from '@libp2p/logger'
import all from 'it-all'
import filter from 'it-filter'
import { pipe } from 'it-pipe'
import errCode from 'err-code'
import type { Multiaddr, Resolver } from '@multiformats/multiaddr'
import { multiaddr, resolvers } from '@multiformats/multiaddr'
import { TimeoutController } from 'timeout-abort-controller'
import { AbortError } from '@libp2p/interfaces/errors'
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
import type { Connection } from '@libp2p/interface-connection'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Startable } from '@libp2p/interfaces/startable'
import type { PeerId } from '@libp2p/interface-peer-id'
import { getPeer } from '../../get-peer.js'
import sort from 'it-sort'
import type { Components } from '@libp2p/components'
import map from 'it-map'
import type { AddressSorter } from '@libp2p/interface-peer-store'
import type { ComponentMetricsTracker } from '@libp2p/interface-metrics'
import type { Dialer } from '@libp2p/interface-connection-manager'

const log = logger('libp2p:dialer')

const METRICS_COMPONENT = 'dialler'
const METRICS_PENDING_DIALS = 'pending-dials'
const METRICS_PENDING_DIAL_TARGETS = 'pending-dial-targets'

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
  metrics?: ComponentMetricsTracker
}

export class DefaultDialer implements Startable, Dialer {
  private readonly components: Components
  private readonly addressSorter: AddressSorter
  private readonly maxAddrsToDial: number
  private readonly timeout: number
  private readonly maxDialsPerPeer: number
  public tokens: number[]
  public pendingDials: Map<string, PendingDial>
  public pendingDialTargets: Map<string, PendingDialTarget>
  private started: boolean

  constructor (components: Components, init: DialerInit = {}) {
    this.started = false
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxAddrsToDial = init.maxAddrsToDial ?? MAX_ADDRS_TO_DIAL
    this.timeout = init.dialTimeout ?? DIAL_TIMEOUT
    this.maxDialsPerPeer = init.maxDialsPerPeer ?? MAX_PER_PEER_DIALS
    this.tokens = [...new Array(init.maxParallelDials ?? MAX_PARALLEL_DIALS)].map((_, index) => index)
    this.components = components
    this.pendingDials = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PENDING_DIALS,
      metrics: init.metrics
    })
    this.pendingDialTargets = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PENDING_DIAL_TARGETS,
      metrics: components.getMetrics()
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
      pendingTarget.reject(new AbortError('Dialer was destroyed'))
    }
    this.pendingDialTargets.clear()
  }

  /**
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   */
  async dial (peer: PeerId | Multiaddr, options: AbortOptions = {}): Promise<Connection> {
    const { id, multiaddrs } = getPeer(peer)

    if (this.components.getPeerId().equals(id)) {
      throw errCode(new Error('Tried to dial self'), codes.ERR_DIALED_SELF)
    }

    log('check multiaddrs %p', id)

    if (multiaddrs != null && multiaddrs.length > 0) {
      log('storing multiaddrs %p', id, multiaddrs)
      await this.components.getPeerStore().addressBook.add(id, multiaddrs)
    }

    if (await this.components.getConnectionGater().denyDialPeer(id)) {
      throw errCode(new Error('The dial request is blocked by gater.allowDialPeer'), codes.ERR_PEER_DIAL_INTERCEPTED)
    }

    log('creating dial target for %p', id)

    const dialTarget = await this._createCancellableDialTarget(id, options)

    if (dialTarget.addrs.length === 0) {
      throw errCode(new Error('The dial request has no valid addresses'), codes.ERR_NO_VALID_ADDRESSES)
    }

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
   * Connects to a given `peer` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   */
  async _createCancellableDialTarget (peer: PeerId, options: AbortOptions): Promise<DialTarget> {
    // Make dial target promise cancellable
    const id = `${(parseInt(String(Math.random() * 1e9), 10)).toString()}${Date.now()}`
    const cancellablePromise = new Promise<DialTarget>((resolve, reject) => {
      this.pendingDialTargets.set(id, { resolve, reject })
    })

    try {
      const dialTarget = await Promise.race([
        this._createDialTarget(peer, options),
        cancellablePromise
      ])

      return dialTarget
    } finally {
      this.pendingDialTargets.delete(id)
    }
  }

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   * If a multiaddr is received it should be the first address attempted.
   * Multiaddrs not supported by the available transports will be filtered out.
   */
  async _createDialTarget (peer: PeerId, options: AbortOptions): Promise<DialTarget> {
    const _resolve = this._resolve.bind(this)

    const addrs = await pipe(
      await this.components.getPeerStore().addressBook.get(peer),
      (source) => filter(source, async (address) => {
        return !(await this.components.getConnectionGater().denyDialMultiaddr(peer, address.multiaddr))
      }),
      // Sort addresses so, for example, we try certified public address first
      (source) => sort(source, this.addressSorter),
      async function * resolve (source) {
        for await (const a of source) {
          yield * await _resolve(a.multiaddr, options)
        }
      },
      // Multiaddrs not supported by the available transports will be filtered out.
      (source) => filter(source, (ma) => Boolean(this.components.getTransportManager().transportForMultiaddr(ma))),
      (source) => map(source, (ma) => {
        if (peer.toString() === ma.getPeerId()) {
          return ma
        }

        return ma.encapsulate(`/p2p/${peer.toString()}`)
      }),
      async (source) => await all(source)
    )

    if (addrs.length > this.maxAddrsToDial) {
      await this.components.getPeerStore().delete(peer)
      throw errCode(new Error('dial with more addresses than allowed'), codes.ERR_TOO_MANY_ADDRESSES)
    }

    return {
      id: peer.toString(),
      addrs
    }
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

      return await this.components.getTransportManager().dial(addr, options).catch(err => {
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
