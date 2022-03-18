import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import mergeOptions from 'merge-options'
import { LatencyMonitor, SummaryObject } from './latency-monitor.js'
// @ts-expect-error retimer does not have types
import retimer from 'retimer'
import { CustomEvent, EventEmitter, Startable } from '@libp2p/interfaces'
import { trackedMap } from '@libp2p/tracked-map'
import { codes } from '../errors.js'
import { isPeerId, PeerId } from '@libp2p/interfaces/peer-id'
// @ts-expect-error setMaxListeners is missing from the node 16 types
import { setMaxListeners } from 'events'
import type { Connection } from '@libp2p/interfaces/connection'
import type { ConnectionManager } from '@libp2p/interfaces/registrar'
import type { Components } from '@libp2p/interfaces/components'
import * as STATUS from '@libp2p/interfaces/connection/status'

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
  movingAverageInterval: 60000,
  defaultPeerValue: 1
}

const METRICS_COMPONENT = 'connection-manager'
const METRICS_PEER_CONNECTIONS = 'peer-connections'
const METRICS_PEER_VALUES = 'peer-values'

export interface ConnectionManagerEvents {
  'peer:connect': CustomEvent<PeerId>
  'peer:disconnect': CustomEvent<PeerId>
}

export interface ConnectionManagerInit {
  /**
   * The maximum number of connections allowed
   */
  maxConnections?: number

  /**
   * The minimum number of connections to avoid pruning
   */
  minConnections?: number

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
   * The value of the peer
   */
  defaultPeerValue?: number

  /**
   * Should preemptively guarantee connections are above the low watermark
   */
  autoDial?: boolean

  /**
   * How often, in milliseconds, it should preemptively guarantee connections are above the low watermark
   */
  autoDialInterval?: number
}

/**
 * Responsible for managing known connections.
 */
export class DefaultConnectionManager extends EventEmitter<ConnectionManagerEvents> implements ConnectionManager, Startable {
  private readonly components: Components
  private readonly init: Required<ConnectionManagerInit>
  private readonly peerValues: Map<string, number>
  private readonly connections: Map<string, Connection[]>
  private started: boolean
  private timer?: ReturnType<retimer>
  private readonly latencyMonitor: LatencyMonitor

  constructor (components: Components, init: ConnectionManagerInit = {}) {
    super()

    this.components = components
    this.init = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, init)

    if (this.init.maxConnections < this.init.minConnections) {
      throw errCode(new Error('Connection Manager maxConnections must be greater than minConnections'), codes.ERR_INVALID_PARAMETERS)
    }

    log('options: %o', this.init)

    /**
     * Map of peer identifiers to their peer value for pruning connections.
     *
     * @type {Map<string, number>}
     */
    this.peerValues = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PEER_VALUES,
      metrics: this.components.getMetrics()
    })

    /**
     * Map of connections per peer
     */
    this.connections = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PEER_CONNECTIONS,
      metrics: this.components.getMetrics()
    })

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

    this.components.getUpgrader().addEventListener('connection', (evt) => {
      void this.onConnect(evt).catch(err => {
        log.error(err)
      })
    })
    this.components.getUpgrader().addEventListener('connectionEnd', this.onDisconnect.bind(this))
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
      this.timer = this.timer ?? retimer(this._checkMetrics, this.init.pollInterval)
    }

    // latency monitor
    this.latencyMonitor.start()
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this.latencyMonitor.addEventListener('data', this._onLatencyMeasure)

    this.started = true
    log('started')
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
    const tasks = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push(connection.close())
      }
    }

    log('closing %d connections', tasks.length)
    await Promise.all(tasks)
    this.connections.clear()
  }

  /**
   * Sets the value of the given peer. Peers with lower values
   * will be disconnected first.
   */
  setPeerValue (peerId: PeerId, value: number) {
    if (value < 0 || value > 1) {
      throw new Error('value should be a number between 0 and 1')
    }

    this.peerValues.set(peerId.toString(), value)
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
        const received = movingAverages.dataReceived[this.init.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxReceivedData', received)
        const sent = movingAverages.dataSent[this.init.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxSentData', sent)
        const total = received + sent
        await this._checkMaxLimit('maxData', total)
        log('metrics update', total)
      } finally {
        this.timer = retimer(this._checkMetrics, this.init.pollInterval)
      }
    }
  }

  /**
   * Tracks the incoming connection and check the connection limit
   */
  async onConnect (evt: CustomEvent<Connection>) {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      await connection.close()
      return
    }

    const peerId = connection.remotePeer
    const peerIdStr = peerId.toString()
    const storedConns = this.connections.get(peerIdStr)

    this.dispatchEvent(new CustomEvent<Connection>('peer:connect', { detail: connection }))

    if (storedConns != null) {
      storedConns.push(connection)
    } else {
      this.connections.set(peerIdStr, [connection])
    }

    if (peerId.publicKey != null) {
      await this.components.getPeerStore().keyBook.set(peerId, peerId.publicKey)
    }

    if (!this.peerValues.has(peerIdStr)) {
      this.peerValues.set(peerIdStr, this.init.defaultPeerValue)
    }

    await this._checkMaxLimit('maxConnections', this.getConnectionList().length)
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
      this.peerValues.delete(connection.remotePeer.toString())
      this.dispatchEvent(new CustomEvent<Connection>('peer:disconnect', { detail: connection }))

      this.components.getMetrics()?.onPeerDisconnected(connection.remotePeer)
    }
  }

  getConnectionMap (): Map<string, Connection[]> {
    return this.connections
  }

  getConnectionList (): Connection[] {
    let output: Connection[] = []

    for (const connections of this.connections.values()) {
      output = output.concat(connections)
    }

    return output
  }

  getConnections (peerId: PeerId): Connection[] {
    return this.connections.get(peerId.toString()) ?? []
  }

  /**
   * Get a connection with a peer
   */
  getConnection (peerId: PeerId): Connection | undefined {
    const connections = this.getAll(peerId)

    if (connections.length > 0) {
      return connections[0]
    }

    return undefined
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

    this._checkMaxLimit('maxEventLoopDelay', summary.avgMs)
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * If the `value` of `name` has exceeded its limit, maybe close a connection
   */
  async _checkMaxLimit (name: keyof ConnectionManagerInit, value: number) {
    const limit = this.init[name]
    log.trace('checking limit of %s. current value: %d of %d', name, value, limit)
    if (value > limit) {
      log('%s: limit exceeded: %p, %d', this.components.getPeerId(), name, value)
      await this._maybeDisconnectOne()
    }
  }

  /**
   * If we have more connections than our maximum, close a connection
   * to the lowest valued peer.
   */
  async _maybeDisconnectOne () {
    if (this.init.minConnections < this.connections.size) {
      const peerValues = Array.from(new Map([...this.peerValues.entries()].sort((a, b) => a[1] - b[1])))

      log('%p: sorted peer values: %j', this.components.getPeerId(), peerValues)
      const disconnectPeer = peerValues[0]

      if (disconnectPeer != null) {
        const peerId = disconnectPeer[0]
        log('%p: lowest value peer is %s', this.components.getPeerId(), peerId)
        log('%p: closing a connection to %j', this.components.getPeerId(), peerId)

        for (const connections of this.connections.values()) {
          if (connections[0].remotePeer.toString() === peerId) {
            void connections[0].close()
              .catch(err => {
                log.error(err)
              })

            // TODO: should not need to invoke this manually
            this.onDisconnect(new CustomEvent<Connection>('connectionEnd', {
              detail: connections[0]
            }))
            break
          }
        }
      }
    }
  }
}
