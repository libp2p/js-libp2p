import { randomBytes } from '@libp2p/crypto'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { abortableDuplex } from 'abortable-iterator'
import first from 'it-first'
import { pipe } from 'it-pipe'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { codes } from '../errors.js'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Stream } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Startable } from '@libp2p/interface/startable'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:ping')

export interface PingService {
  ping: (peer: PeerId | Multiaddr | Multiaddr[], options?: AbortOptions) => Promise<number>
}

export interface PingServiceInit {
  protocolPrefix?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number
  runOnTransientConnection?: boolean

  /**
   * How long we should wait for a ping response
   */
  timeout?: number
}

export interface PingServiceComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
}

class DefaultPingService implements Startable, PingService {
  public readonly protocol: string
  private readonly components: PingServiceComponents
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnTransientConnection: boolean

  constructor (components: PingServiceComponents, init: PingServiceInit) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnTransientConnection = init.runOnTransientConnection ?? true
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnTransientConnection: this.runOnTransientConnection
    })
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * A handler to register with Libp2p to process ping messages
   */
  handleMessage (data: IncomingStreamData): void {
    log('incoming ping from %p', data.connection.remotePeer)

    const { stream } = data
    const start = Date.now()

    void pipe(stream, stream)
      .catch(err => {
        log.error('incoming ping from %p failed with error', data.connection.remotePeer, err)
      })
      .finally(() => {
        const ms = Date.now() - start

        log('incoming ping from %p complete in %dms', data.connection.remotePeer, ms)
      })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   *
   * @param {PeerId|Multiaddr} peer
   * @returns {Promise<number>}
   */
  async ping (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<number> {
    log('pinging %p', peer)

    const start = Date.now()
    const data = randomBytes(PING_LENGTH)
    const connection = await this.components.connectionManager.openConnection(peer, options)
    let stream: Stream | undefined

    options.signal = options.signal ?? AbortSignal.timeout(this.timeout)

    try {
      stream = await connection.newStream(this.protocol, {
        ...options,
        runOnTransientConnection: this.runOnTransientConnection
      })

      // make stream abortable
      const source = abortableDuplex(stream, options.signal)

      const result = await pipe(
        [data],
        source,
        async (source) => first(source)
      )

      const ms = Date.now() - start

      if (result == null) {
        throw new CodeError(`Did not receive a ping ack after ${ms}ms`, codes.ERR_WRONG_PING_ACK)
      }

      if (!uint8ArrayEquals(data, result.subarray())) {
        throw new CodeError(`Received wrong ping ack after ${ms}ms`, codes.ERR_WRONG_PING_ACK)
      }

      log('ping %p complete in %dms', connection.remotePeer, ms)

      return ms
    } catch (err: any) {
      log.error('error while pinging %p', connection.remotePeer, err)

      stream?.abort(err)

      throw err
    } finally {
      if (stream != null) {
        await stream.close()
      }
    }
  }
}

export function pingService (init: PingServiceInit = {}): (components: PingServiceComponents) => PingService {
  return (components) => new DefaultPingService(components, init)
}
