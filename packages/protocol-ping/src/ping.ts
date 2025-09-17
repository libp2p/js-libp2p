import { randomBytes } from '@libp2p/crypto'
import { ProtocolError, serviceCapabilities, setMaxListeners, TimeoutError } from '@libp2p/interface'
import { pEvent } from 'p-event'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_PREFIX, PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION, TIMEOUT, MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS } from './constants.js'
import type { PingComponents, PingInit, Ping as PingInterface } from './index.js'
import type { AbortOptions, Stream, PeerId, Startable, Connection, StreamMessageEvent } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class Ping implements Startable, PingInterface {
  public readonly protocol: string
  private readonly components: PingComponents
  private started: boolean
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnLimitedConnection: boolean

  constructor (components: PingComponents, init: PingInit = {}) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? true

    this.handlePing = this.handlePing.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/ping'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/ping'
  ]

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handlePing, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
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
  async handlePing (stream: Stream, connection: Connection): Promise<void> {
    const log = stream.log.newScope('ping')
    log.trace('ping from %p', connection.remotePeer)
    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)
    signal.addEventListener('abort', () => {
      stream.abort(new TimeoutError('Ping timed out'))
    })
    const start = Date.now()

    for await (const buf of stream) {
      if (stream.status !== 'open') {
        log('stream status changed to %s', stream.status)
        break
      }

      if (!stream.send(buf)) {
        log('waiting for stream to drain')
        await pEvent(stream, 'drain', {
          rejectionEvents: [
            'close'
          ],
          signal
        })
        log('stream drained')
      }
    }

    log('ping from %p complete in %dms', connection.remotePeer, Date.now() - start)

    await stream.close({
      signal
    })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   */
  async ping (peer: PeerId | Multiaddr | Multiaddr[], options: AbortOptions = {}): Promise<number> {
    const data = randomBytes(PING_LENGTH)
    const stream = await this.components.connectionManager.openStream(peer, this.protocol, {
      runOnLimitedConnection: this.runOnLimitedConnection,
      ...options
    })
    const log = stream.log.newScope('ping')

    try {
      const start = Date.now()
      const finished = Promise.withResolvers<number>()
      const received = new Uint8ArrayList()

      const onPong = (evt: StreamMessageEvent): void => {
        received.append(evt.data)

        if (received.byteLength === PING_LENGTH) {
          stream.removeEventListener('message', onPong)

          const rtt = Date.now() - start

          Promise.all([
            stream.closeRead(options)
          ])
            .then(() => {
              if (!uint8ArrayEquals(data, received.subarray())) {
                throw new ProtocolError(`Received wrong ping ack after ${rtt}ms`)
              } else {
                finished.resolve(rtt)
              }
            })
            .catch(err => {
              stream.abort(err)
              finished.reject(err)
            })
        }
      }

      stream.addEventListener('message', onPong)
      stream.send(data)
      await stream.close(options)

      return await raceSignal(finished.promise, options.signal)
    } catch (err: any) {
      log.error('error while pinging %o - %e', peer, err)

      stream?.abort(err)

      throw err
    } finally {
      stream?.close()
    }
  }
}
