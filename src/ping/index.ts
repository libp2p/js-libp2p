import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import { codes } from '../errors.js'
import { randomBytes } from '@libp2p/crypto'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { AbortOptions } from '@libp2p/interfaces'
import { abortableDuplex } from 'abortable-iterator'
import type { Stream } from '@libp2p/interface-connection'
import { setMaxListeners } from 'events'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import { anySignal } from 'any-signal'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:ping')

export interface PingService {
  ping: (peer: PeerId | Multiaddr | Multiaddr[], options?: AbortOptions) => Promise<number>
}

export interface PingServiceInit {
  protocolPrefix?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number

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

  constructor (components: PingServiceComponents, init: PingServiceInit) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
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
    const { stream } = data

    void pipe(stream, stream)
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   *
   * @param {PeerId|Multiaddr} peer
   * @returns {Promise<number>}
   */
  async ping (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<number> {
    log('dialing %s to %p', this.protocol, peer)

    const start = Date.now()
    const data = randomBytes(PING_LENGTH)
    const connection = await this.components.connectionManager.openConnection(peer, options)
    let signal = options.signal
    let stream: Stream | undefined

    // create a timeout if no abort signal passed
    if (signal == null) {
      signal = anySignal([AbortSignal.timeout(this.timeout), options.signal])

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, signal)
      } catch {}
    }

    try {
      stream = await connection.newStream([this.protocol], {
        signal
      })

      // make stream abortable
      const source = abortableDuplex(stream, signal)

      const result = await pipe(
        [data],
        source,
        async (source) => await first(source)
      )
      const end = Date.now()

      if (result == null || !uint8ArrayEquals(data, result.subarray())) {
        throw new CodeError('Received wrong ping ack', codes.ERR_WRONG_PING_ACK)
      }

      return end - start
    } finally {
      if (stream != null) {
        stream.close()
      }
    }
  }
}

export function pingService (init: PingServiceInit = {}): (components: PingServiceComponents) => PingService {
  return (components) => new DefaultPingService(components, init)
}
