import { connectionSymbol, LimitedConnectionError, ConnectionClosedError, ConnectionClosingError } from '@libp2p/interface'
import { setMaxListeners } from 'main-event'
import type { AbortOptions, Logger, ComponentLogger, Direction, Connection, Stream, ConnectionTimeline, ConnectionStatus, NewStreamOptions, PeerId, ConnectionLimits } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const CLOSE_TIMEOUT = 500

interface ConnectionInit {
  remoteAddr: Multiaddr
  remotePeer: PeerId
  newStream(protocols: string[], options?: AbortOptions): Promise<Stream>
  close(options?: AbortOptions): Promise<void>
  abort(err: Error): void
  getStreams(): Stream[]
  status: ConnectionStatus
  direction: Direction
  timeline: ConnectionTimeline
  multiplexer?: string
  encryption?: string
  limits?: ConnectionLimits
  logger: ComponentLogger
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
  public limits?: ConnectionLimits
  public readonly log: Logger

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
    this.limits = init.limits
    this.log = init.logger.forComponent(`libp2p:connection:${this.direction}:${this.id}`)

    if (this.remoteAddr.getPeerId() == null) {
      this.remoteAddr = this.remoteAddr.encapsulate(`/p2p/${this.remotePeer}`)
    }

    this._newStream = newStream
    this._close = close
    this._abort = abort
    this._getStreams = getStreams
    this.tags = []
  }

  readonly [Symbol.toStringTag] = 'Connection'

  readonly [connectionSymbol] = true

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
      throw new ConnectionClosingError('the connection is being closed')
    }

    if (this.status === 'closed') {
      throw new ConnectionClosedError('the connection is closed')
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    if (this.limits != null && options?.runOnLimitedConnection !== true) {
      throw new LimitedConnectionError('Cannot open protocol stream on limited connection')
    }

    const stream = await this._newStream(protocols, options)

    stream.direction = 'outbound'

    return stream
  }

  /**
   * Close the connection
   */
  async close (options: AbortOptions = {}): Promise<void> {
    if (this.status === 'closed' || this.status === 'closing') {
      return
    }

    this.log('closing connection to %a', this.remoteAddr)

    this.status = 'closing'

    if (options.signal == null) {
      const signal = AbortSignal.timeout(CLOSE_TIMEOUT)
      setMaxListeners(Infinity, signal)

      options = {
        ...options,
        signal
      }
    }

    try {
      this.log.trace('closing underlying transport')

      // close raw connection
      await this._close(options)

      this.log.trace('updating timeline with close time')

      this.status = 'closed'
      this.timeline.close = Date.now()
    } catch (err: any) {
      this.log.error('error encountered during graceful close of connection to %a', this.remoteAddr, err)
      this.abort(err)
    }
  }

  abort (err: Error): void {
    if (this.status === 'closed') {
      return
    }

    this.log.error('aborting connection to %a due to error', this.remoteAddr, err)

    this.status = 'closing'

    // Abort raw connection
    this._abort(err)

    this.status = 'closed'
    this.timeline.close = Date.now()
  }
}

export function createConnection (init: ConnectionInit): Connection {
  return new ConnectionImpl(init)
}
