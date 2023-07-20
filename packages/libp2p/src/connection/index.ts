import { type Direction, symbol, type Connection, type Stream, type ConnectionTimeline } from '@libp2p/interface/connection'
import { OPEN, CLOSING, CLOSED } from '@libp2p/interface/connection/status'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interface'
import type * as Status from '@libp2p/interface/connection/status'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:connection')

interface ConnectionInit {
  remoteAddr: Multiaddr
  remotePeer: PeerId
  newStream: (protocols: string[], options?: AbortOptions) => Promise<Stream>
  close: () => Promise<void>
  getStreams: () => Stream[]
  status: keyof typeof Status
  direction: Direction
  timeline: ConnectionTimeline
  multiplexer?: string
  encryption?: string
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
  public status: keyof typeof Status

  /**
   * User provided tags
   *
   */
  public tags: string[]

  /**
   * Reference to the new stream function of the multiplexer
   */
  private readonly _newStream: (protocols: string[], options?: AbortOptions) => Promise<Stream>

  /**
   * Reference to the close function of the raw connection
   */
  private readonly _close: () => Promise<void>

  /**
   * Reference to the getStreams function of the muxer
   */
  private readonly _getStreams: () => Stream[]

  private _closing: boolean

  /**
   * An implementation of the js-libp2p connection.
   * Any libp2p transport should use an upgrader to return this connection.
   */
  constructor (init: ConnectionInit) {
    const { remoteAddr, remotePeer, newStream, close, getStreams } = init

    this.id = `${(parseInt(String(Math.random() * 1e9))).toString(36)}${Date.now()}`
    this.remoteAddr = remoteAddr
    this.remotePeer = remotePeer
    this.direction = init.direction
    this.status = OPEN
    this.timeline = init.timeline
    this.multiplexer = init.multiplexer
    this.encryption = init.encryption

    this._newStream = newStream
    this._close = close
    this._getStreams = getStreams
    this.tags = []
    this._closing = false
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
  async newStream (protocols: string | string[], options?: AbortOptions): Promise<Stream> {
    if (this.status === CLOSING) {
      throw new CodeError('the connection is being closed', 'ERR_CONNECTION_BEING_CLOSED')
    }

    if (this.status === CLOSED) {
      throw new CodeError('the connection is closed', 'ERR_CONNECTION_CLOSED')
    }

    if (!Array.isArray(protocols)) {
      protocols = [protocols]
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
  async close (): Promise<void> {
    if (this.status === CLOSED || this._closing) {
      return
    }

    this.status = CLOSING

    // close all streams - this can throw if we're not multiplexed
    try {
      this.streams.forEach(s => { s.close() })
    } catch (err) {
      log.error(err)
    }

    // Close raw connection
    this._closing = true
    await this._close()
    this._closing = false

    this.timeline.close = Date.now()
    this.status = CLOSED
  }
}

export function createConnection (init: ConnectionInit): Connection {
  return new ConnectionImpl(init)
}
