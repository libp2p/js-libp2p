import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import mergeOptions from 'merge-options'
import { LatencyMonitor, SummaryObject } from './latency-monitor.js'
// @ts-expect-error retimer does not have types
import retimer from 'retimer'
import type { AbortOptions } from '@libp2p/interfaces'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import { codes } from '../errors.js'
import { isPeerId, PeerId } from '@libp2p/interface-peer-id'
import { setMaxListeners } from 'events'
import type { Connection, MultiaddrConnection } from '@libp2p/interface-connection'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import { Components, Initializable } from '@libp2p/components'
import * as STATUS from '@libp2p/interface-connection/status'
import type { AddressSorter } from '@libp2p/interface-peer-store'
import type { Resolver } from '@multiformats/multiaddr'
import { PeerMap } from '@libp2p/peer-collections'
import { TimeoutController } from 'timeout-abort-controller'
import { KEEP_ALIVE } from '@libp2p/interface-peer-store/tags'

const log = logger('libp2p:connection-manager')

const defaultOptions: Partial<ConnectionManagerInit> = {
  maxConnections: Infinity,
  minConnections: 0,
  maxData: Infinity,
  maxSentData: Infinity,
  maxReceivedData: Infinity,
  maxEventLoopDelay: Infinity,
  pollInterval: 2000,
  autoDialInterval: 10000,
  movingAverageInterval: 60000
}

const METRICS_SYSTEM = 'libp2p'
const METRICS_COMPONENT = 'connection-manager'
const STARTUP_RECONNECT_TIMEOUT = 60000

export interface ConnectionManagerInit {
  /**
   * The maximum number of connections to keep open
   */
  maxConnections: number

  /**
   * The minimum number of connections to keep open
   */
  minConnections: number

  /**
   * The max data (in and out), per average interval to allow
   */
  maxData?: number

  /**
   * The max outgoing data, per average interval to allow
   */
  maxSentData?: number

  /**
   * The max incoming data, per average interval to allow
   */
  maxReceivedData?: number

  /**
   * The upper limit the event loop can take to run
   */
  maxEventLoopDelay?: number

  /**
   * How often, in milliseconds, metrics and latency should be checked
   */
  pollInterval?: number

  /**
   * How often, in milliseconds, to compute averages
   */
  movingAverageInterval?: number

  /**
   * If true, try to connect to all discovered peers up to the connection manager limit
   */
  autoDial?: boolean

  /**
   * How long to wait between attempting to keep our number of concurrent connections
   * above minConnections
   */
  autoDialInterval: number

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
   * How long a dial attempt is allowed to take, including DNS resolution
   * of the multiaddr, opening a socket and upgrading it to a Connection.
   */
  dialTimeout?: number

  /**
   * When a new inbound connection is opened, the upgrade process (e.g. protect,
   * encrypt, multiplex etc) must complete within this number of ms.
   */
  inboundUpgradeTimeout: number

  /**
   * Number of max concurrent dials per peer
   */
  maxDialsPerPeer?: number

  /**
   * Multiaddr resolvers to use when dialing
   */
  resolvers?: Record<string, Resolver>

  /**
   * On startup we try to dial any peer that has previously been
   * tagged with KEEP_ALIVE up to this timeout in ms. (default: 60000)
   */
  startupReconnectTimeout?: number
}

export interface ConnectionManagerEvents {
  'peer:connect': CustomEvent<PeerId>
  'peer:disconnect': CustomEvent<PeerId>
}

/**
 * Responsible for managing known connections.
 */
export class DefaultConnectionManager extends EventEmitter<ConnectionManagerEvents> implements ConnectionManager, Startable, Initializable {
  private components = new Components()
  private readonly opts: Required<ConnectionManagerInit>
  private readonly connections: Map<string, Connection[]>
  private started: boolean
  private timer?: ReturnType<retimer>
  private readonly latencyMonitor: LatencyMonitor
  private readonly startupReconnectTimeout: number
  private connectOnStartupController?: TimeoutController
  private readonly dialTimeout: number

  constructor (init: ConnectionManagerInit) {
    super()

    this.opts = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, init)

    if (this.opts.maxConnections < this.opts.minConnections) {
      throw errCode(new Error('Connection Manager maxConnections must be greater than minConnections'), codes.ERR_INVALID_PARAMETERS)
    }

    log('options: %o', this.opts)

    /**
     * Map of connections per peer
     */
    this.connections = new Map()

    this.started = false
    this._checkMetrics = this._checkMetrics.bind(this)

    this.latencyMonitor = new LatencyMonitor({
      latencyCheckIntervalMs: init.pollInterval,
      dataEmitIntervalMs: init.pollInterval
    })

    try {
      // This emitter gets listened to a lot
      setMaxListeners?.(Infinity, this)
    } catch {}

    this.onConnect = this.onConnect.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)

    this.startupReconnectTimeout = init.startupReconnectTimeout ?? STARTUP_RECONNECT_TIMEOUT
    this.dialTimeout = init.dialTimeout ?? 30000
  }

  init (components: Components): void {
    this.components = components

    // track inbound/outbound connections
    this.components.getMetrics()?.updateComponentMetric({
      system: METRICS_SYSTEM,
      component: METRICS_COMPONENT,
      metric: 'connections',
      label: 'direction',
      value: () => {
        const metric = {
          inbound: 0,
          outbound: 0
        }

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            if (conn.stat.direction === 'inbound') {
              metric.inbound++
            } else {
              metric.outbound++
            }
          }
        }

        return metric
      }
    })

    // track total number of streams per protocol
    this.components.getMetrics()?.updateComponentMetric({
      system: METRICS_SYSTEM,
      component: METRICS_COMPONENT,
      metric: 'protocol-streams-total',
      label: 'protocol',
      value: () => {
        const metric: Record<string, number> = {}

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            for (const stream of conn.streams) {
              const key = `${stream.stat.direction} ${stream.stat.protocol ?? 'unnegotiated'}`

              metric[key] = (metric[key] ?? 0) + 1
            }
          }
        }

        return metric
      }
    })

    // track 90th percentile of streams per protocol
    this.components.getMetrics()?.updateComponentMetric({
      system: METRICS_SYSTEM,
      component: METRICS_COMPONENT,
      metric: 'protocol-streams-per-connection-90th-percentile',
      label: 'protocol',
      value: () => {
        const allStreams: Record<string, number[]> = {}

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            const streams: Record<string, number> = {}

            for (const stream of conn.streams) {
              const key = `${stream.stat.direction} ${stream.stat.protocol ?? 'unnegotiated'}`

              streams[key] = (streams[key] ?? 0) + 1
            }

            for (const [protocol, count] of Object.entries(streams)) {
              allStreams[protocol] = allStreams[protocol] ?? []
              allStreams[protocol].push(count)
            }
          }
        }

        const metric: Record<string, number> = {}

        for (let [protocol, counts] of Object.entries(allStreams)) {
          counts = counts.sort((a, b) => a - b)

          const index = Math.floor(counts.length * 0.9)
          metric[protocol] = counts[index]
        }

        return metric
      }
    })
  }

  isStarted () {
    return this.started
  }

  /**
   * Starts the Connection Manager. If Metrics are not enabled on libp2p
   * only event loop and connection limits will be monitored.
   */
  async start () {
    if (this.components.getMetrics() != null) {
      this.timer = this.timer ?? retimer(this._checkMetrics, this.opts.pollInterval)
    }

    // latency monitor
    this.latencyMonitor.start()
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this.latencyMonitor.addEventListener('data', this._onLatencyMeasure)

    this.started = true
    log('started')
  }

  async afterStart () {
    this.components.getUpgrader().addEventListener('connection', this.onConnect)
    this.components.getUpgrader().addEventListener('connectionEnd', this.onDisconnect)

    // re-connect to any peers with the KEEP_ALIVE tag
    void Promise.resolve()
      .then(async () => {
        const keepAlivePeers: PeerId[] = []

        for (const peer of await this.components.getPeerStore().all()) {
          const tags = await this.components.getPeerStore().getTags(peer.id)
          const hasKeepAlive = tags.filter(tag => tag.name === KEEP_ALIVE).length > 0

          if (hasKeepAlive) {
            keepAlivePeers.push(peer.id)
          }
        }

        this.connectOnStartupController?.clear()
        this.connectOnStartupController = new TimeoutController(this.startupReconnectTimeout)

        try {
          // fails on node < 15.4
          setMaxListeners?.(Infinity, this.connectOnStartupController.signal)
        } catch {}

        await Promise.all(
          keepAlivePeers.map(async peer => {
            await this.openConnection(peer, {
              signal: this.connectOnStartupController?.signal
            })
              .catch(err => {
                log.error(err)
              })
          })
        )
      })
      .catch(err => {
        log.error(err)
      })
      .finally(() => {
        this.connectOnStartupController?.clear()
      })
  }

  async beforeStop () {
    // if we are still dialing KEEP_ALIVE peers, abort those dials
    this.connectOnStartupController?.abort()
    this.components.getUpgrader().removeEventListener('connection', this.onConnect)
    this.components.getUpgrader().removeEventListener('connectionEnd', this.onDisconnect)
  }

  /**
   * Stops the Connection Manager
   */
  async stop () {
    this.timer?.clear()

    this.latencyMonitor.removeEventListener('data', this._onLatencyMeasure)
    this.latencyMonitor.stop()

    this.started = false
    await this._close()
    log('stopped')
  }

  /**
   * Cleans up the connections
   */
  async _close () {
    // Close all connections we're tracking
    const tasks: Array<Promise<void>> = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push((async () => {
          try {
            await connection.close()
          } catch (err) {
            log.error(err)
          }
        })())
      }
    }

    log('closing %d connections', tasks.length)
    await Promise.all(tasks)
    this.connections.clear()
  }

  /**
   * Checks the libp2p metrics to determine if any values have exceeded
   * the configured maximums.
   *
   * @private
   */
  async _checkMetrics () {
    const metrics = this.components.getMetrics()

    if (metrics != null) {
      try {
        const movingAverages = metrics.getGlobal().getMovingAverages()
        const received = movingAverages.dataReceived[this.opts.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxReceivedData', received)
        const sent = movingAverages.dataSent[this.opts.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxSentData', sent)
        const total = received + sent
        await this._checkMaxLimit('maxData', total)
        log.trace('metrics update', total)
      } finally {
        this.timer = retimer(this._checkMetrics, this.opts.pollInterval)
      }
    }
  }

  onConnect (evt: CustomEvent<Connection>) {
    void this._onConnect(evt).catch(err => {
      log.error(err)
    })
  }

  /**
   * Tracks the incoming connection and check the connection limit
   */
  async _onConnect (evt: CustomEvent<Connection>) {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      await connection.close()
      return
    }

    const peerId = connection.remotePeer
    const peerIdStr = peerId.toString()
    const storedConns = this.connections.get(peerIdStr)

    if (storedConns != null) {
      storedConns.push(connection)
    } else {
      this.connections.set(peerIdStr, [connection])
    }

    if (peerId.publicKey != null) {
      await this.components.getPeerStore().keyBook.set(peerId, peerId.publicKey)
    }

    const numConnections = this.getConnections().length
    const toPrune = numConnections - this.opts.maxConnections

    await this._checkMaxLimit('maxConnections', numConnections, toPrune)
    this.dispatchEvent(new CustomEvent<Connection>('peer:connect', { detail: connection }))
  }

  /**
   * Removes the connection from tracking
   */
  onDisconnect (evt: CustomEvent<Connection>) {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      return
    }

    const peerId = connection.remotePeer.toString()
    let storedConn = this.connections.get(peerId)

    if (storedConn != null && storedConn.length > 1) {
      storedConn = storedConn.filter((conn) => conn.id !== connection.id)
      this.connections.set(peerId, storedConn)
    } else if (storedConn != null) {
      this.connections.delete(peerId)
      this.dispatchEvent(new CustomEvent<Connection>('peer:disconnect', { detail: connection }))

      this.components.getMetrics()?.onPeerDisconnected(connection.remotePeer)
    }
  }

  getConnections (peerId?: PeerId): Connection[] {
    if (peerId != null) {
      return this.connections.get(peerId.toString()) ?? []
    }

    let conns: Connection[] = []

    for (const c of this.connections.values()) {
      conns = conns.concat(c)
    }

    return conns
  }

  async openConnection (peerId: PeerId, options: AbortOptions = {}): Promise<Connection> {
    log('dial to %p', peerId)
    const existingConnections = this.getConnections(peerId)

    if (existingConnections.length > 0) {
      log('had an existing connection to %p', peerId)

      return existingConnections[0]
    }

    let timeoutController: TimeoutController | undefined

    if (options?.signal == null) {
      timeoutController = new TimeoutController(this.dialTimeout)
      options.signal = timeoutController.signal

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, timeoutController.signal)
      } catch {}
    }

    try {
      const connection = await this.components.getDialer().dial(peerId, options)
      let peerConnections = this.connections.get(peerId.toString())

      if (peerConnections == null) {
        peerConnections = []
        this.connections.set(peerId.toString(), peerConnections)
      }

      // we get notified of connections via the Upgrader emitting "connection"
      // events, double check we aren't already tracking this connection before
      // storing it
      let trackedConnection = false

      for (const conn of peerConnections) {
        if (conn.id === connection.id) {
          trackedConnection = true
        }
      }

      if (!trackedConnection) {
        peerConnections.push(connection)
      }

      return connection
    } finally {
      if (timeoutController != null) {
        timeoutController.clear()
      }
    }
  }

  async closeConnections (peerId: PeerId): Promise<void> {
    const connections = this.connections.get(peerId.toString()) ?? []

    await Promise.all(
      connections.map(async connection => {
        return await connection.close()
      })
    )
  }

  /**
   * Get all open connections with a peer
   */
  getAll (peerId: PeerId): Connection[] {
    if (!isPeerId(peerId)) {
      throw errCode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toString()
    const connections = this.connections.get(id)

    // Return all open connections
    if (connections != null) {
      return connections.filter(connection => connection.stat.status === STATUS.OPEN)
    }

    return []
  }

  /**
   * If the event loop is slow, maybe close a connection
   */
  _onLatencyMeasure (evt: CustomEvent<SummaryObject>) {
    const { detail: summary } = evt

    this._checkMaxLimit('maxEventLoopDelay', summary.avgMs, 1)
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * If the `value` of `name` has exceeded its limit, maybe close a connection
   */
  async _checkMaxLimit (name: keyof ConnectionManagerInit, value: number, toPrune: number = 1) {
    const limit = this.opts[name]
    log.trace('checking limit of %s. current value: %d of %d', name, value, limit)
    if (value > limit) {
      log('%s: limit exceeded: %p, %d/%d, pruning %d connection(s)', this.components.getPeerId(), name, value, limit, toPrune)
      await this._maybePruneConnections(toPrune)
    }
  }

  /**
   * If we have more connections than our maximum, select some excess connections
   * to prune based on peer value
   */
  async _maybePruneConnections (toPrune: number) {
    const connections = this.getConnections()

    if (connections.length <= this.opts.minConnections || toPrune < 1) {
      return
    }

    const peerValues = new PeerMap<number>()

    // work out peer values
    for (const connection of connections) {
      const remotePeer = connection.remotePeer

      if (peerValues.has(remotePeer)) {
        continue
      }

      const tags = await this.components.getPeerStore().getTags(remotePeer)

      // sum all tag values
      peerValues.set(remotePeer, tags.reduce((acc, curr) => {
        return acc + curr.value
      }, 0))
    }

    // sort by value, lowest to highest
    const sortedConnections = connections.sort((a, b) => {
      const peerAValue = peerValues.get(a.remotePeer) ?? 0
      const peerBValue = peerValues.get(b.remotePeer) ?? 0

      if (peerAValue > peerBValue) {
        return 1
      }

      if (peerAValue < peerBValue) {
        return -1
      }

      return 0
    })

    // close some connections
    const toClose = []

    for (const connection of sortedConnections) {
      log('too many connections open - closing a connection to %p', connection.remotePeer)
      toClose.push(connection)

      if (toClose.length === toPrune) {
        break
      }
    }

    // close connections
    await Promise.all(
      toClose.map(async connection => {
        try {
          await connection.close()
        } catch (err) {
          log.error(err)
        }

        // TODO: should not need to invoke this manually
        this.onDisconnect(new CustomEvent<Connection>('connectionEnd', {
          detail: connection
        }))
      })
    )
  }

  async acceptIncomingConnection (maConn: MultiaddrConnection): Promise<boolean> {
    return true
  }
}
