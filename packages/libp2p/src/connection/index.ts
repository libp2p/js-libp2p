import { setMaxListeners } from 'events'
import { symbol } from '@libp2p/interface/connection'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interface'
import type { Direction, Connection, Stream, ConnectionTimeline, ConnectionStatus, NewStreamOptions } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:connection')

const CLOSE_TIMEOUT = 500

interface ConnectionInit {
  remoteAddr: Multiaddr
  remotePeer: PeerId
  newStream: (protocols: string[], options?: AbortOptions) => Promise<Stream>
  close: (options?: AbortOptions) => Promise<void>
  abort: (err: Error) => void
  getStreams: () => Stream[]
  status: ConnectionStatus
  direction: Direction
  timeline: ConnectionTimeline
  multiplexer?: string
  encryption?: string
  transient?: boolean
}

/**
 * An implementation of the js-libp2p connection.
 * Any libp2p transport should use an upgrader to return this connection.
 */
export class ConnectionImpl implements Connection {
  /**
   * Connection identifier.
   */
  public readonly id: string

  /**
   * Observed multiaddr of the remote peer
   */
  public readonly remoteAddr: Multiaddr

  /**
   * Remote peer id
   */
  public readonly remotePeer: PeerId

  public direction: Direction
  public timeline: ConnectionTimeline
  public multiplexer?: string
  public encryption?: string
  public status: ConnectionStatus
  public transient: boolean

  /**
   * User provided tags
   *
   */
  public tags: string[]

  /**
   * Reference to the new stream function of the multiplexer
   */
  private readonly _newStream: (protocols: string[], options?: NewStreamOptions) => Promise<Stream>

  /**
   * Reference to the close function of the raw connection
   */
  private readonly _close: (options?: AbortOptions) => Promise<void>

  private readonly _abort: (err: Error) => void

  /**
   * Reference to the getStreams function of the muxer
   */
  private readonly _getStreams: () => Stream[]

  /**
   * An implementation of the js-libp2p connection.
   * Any libp2p transport should use an upgrader to return this connection.
   */
  constructor (init: ConnectionInit) {
    const { remoteAddr, remotePeer, newStream, close, abort, getStreams } = init

    this.id = `${(parseInt(String(Math.random() * 1e9))).toString(36)}${Date.now()}`
    this.remoteAddr = remoteAddr
    this.remotePeer = remotePeer
    this.direction = init.direction
    this.status = 'open'
    this.timeline = init.timeline
    this.multiplexer = init.multiplexer
    this.encryption = init.encryption
    this.transient = init.transient ?? false

    this._newStream = newStream
    this._close = close
    this._abort = abort
    this._getStreams = getStreams
    this.tags = []
  }

  readonly [Symbol.toStringTag] = 'Connection'

  readonly [symbol] = true

  /**
   * Get all the streams of the muxer
   */
  get streams (): Stream[] {
    return this._getStreams()
  }

  /**
   * Create a new stream from this connection
   */
  async newStream (protocols: string | string[], options?: NewStreamOptions): Promise<Stream> {
    if (this.status === 'closing') {
      throw new CodeError('the connection is being closed', 'ERR_CONNECTION_BEING_CLOSED')
    }

    if (this.status === 'closed') {
      throw new CodeError('the connection is closed', 'ERR_CONNECTION_CLOSED')
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    if (this.transient && options?.runOnTransientConnection !== true) {
      throw new CodeError('Cannot open protocol stream on transient connection', 'ERR_TRANSIENT_CONNECTION')
    }

    const stream = await this._newStream(protocols, options)

    stream.direction = 'outbound'

    return stream
  }

  /**
   * Add a stream when it is opened to the registry
   */
  addStream (stream: Stream): void {
    stream.direction = 'inbound'
  }

  /**
   * Remove stream registry after it is closed
   */
  removeStream (id: string): void {

  }

  /**
   * Close the connection
   */
  async close (options: AbortOptions = {}): Promise<void> {
    if (this.status === 'closed' || this.status === 'closing') {
      return
    }

    log('closing connection to %a', this.remoteAddr)

    this.status = 'closing'

    options.signal = options?.signal ?? AbortSignal.timeout(CLOSE_TIMEOUT)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, options.signal)
    } catch { }

    try {
      // close all streams gracefully - this can throw if we're not multiplexed
      await Promise.all(
        this.streams.map(async s => s.close(options))
      )

      // Close raw connection
      await this._close(options)

      this.timeline.close = Date.now()
      this.status = 'closed'
    } catch (err: any) {
      log.error('error encountered during graceful close of connection to %a', this.remoteAddr, err)
      this.abort(err)
    }
  }

  abort (err: Error): void {
    log.error('aborting connection to %a due to error', this.remoteAddr, err)

    this.status = 'closing'
    this.streams.forEach(s => { s.abort(err) })

    log.error('all streams aborted', this.streams.length)

    // Abort raw connection
    this._abort(err)

    this.timeline.close = Date.now()
    this.status = 'closed'
  }
}

export function createConnection (init: ConnectionInit): Connection {
  return new ConnectionImpl(init)
}
