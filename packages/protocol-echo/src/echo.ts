import { ProtocolError, setMaxListeners, TimeoutError } from '@libp2p/interface'
import { UnexpectedEOFError } from '@libp2p/utils'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import type { Echo as EchoInterface, EchoComponents, EchoInit } from './index.js'
import type { PeerId, Startable, Stream } from '@libp2p/interface'
import type { OpenConnectionOptions } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * A simple echo stream, any data received will be sent back to the sender
 */
export class Echo implements Startable, EchoInterface {
  public readonly protocol: string
  private readonly components: EchoComponents
  private started: boolean
  private readonly init: EchoInit
  private readonly timeout: number

  constructor (components: EchoComponents, init: EchoInit = {}) {
    this.started = false
    this.components = components
    this.protocol = `/${[init.protocolPrefix, PROTOCOL_NAME, PROTOCOL_VERSION].filter(Boolean).join('/')}`
    this.init = init
    this.timeout = init.timeout ?? 5_000
  }

  readonly [Symbol.toStringTag] = '@libp2p/echo'

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.onEcho.bind(this), {
      maxInboundStreams: this.init.maxInboundStreams,
      maxOutboundStreams: this.init.maxOutboundStreams,
      runOnLimitedConnection: this.init.runOnLimitedConnection
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

  async onEcho (stream: Stream): Promise<void> {
    const log = stream.log.newScope('echo')
    const start = Date.now()
    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)
    let bytes = 0

    signal.addEventListener('abort', () => {
      stream.abort(new TimeoutError())
    })

    for await (const buf of stream) {
      bytes += buf.byteLength

      if (stream.status !== 'open') {
        log('stream status changed to %s', stream.status)
        break
      }

      if (!stream.send(buf)) {
        log('sent %d bytes, wait for drain', bytes)
        await pEvent(stream, 'drain', {
          rejectionEvents: [
            'close'
          ],
          signal
        })
      } else {
        log('sent %d bytes', bytes)
      }
    }

    log('echoed %d bytes in %dms', bytes, Date.now() - start)

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve()
      }, 2_000)
    })

    await stream.close({
      signal
    })
  }

  async echo (peer: PeerId | Multiaddr | Multiaddr[], buf: Uint8Array | Uint8ArrayList, options?: OpenConnectionOptions): Promise<Uint8ArrayList> {
    const stream = await this.components.connectionManager.openStream(peer, this.protocol, {
      ...this.init,
      ...options
    })

    const log = stream.log.newScope('echo')

    const received = new Uint8ArrayList()
    const output = Promise.withResolvers<Uint8ArrayList>()

    stream.addEventListener('message', (evt) => {
      received.append(evt.data)
      log('received %d/%d bytes', received.byteLength, buf.byteLength)
    })

    stream.addEventListener('close', (evt) => {
      if (evt.error != null) {
        output.reject(evt.error)
      }

      if (received.byteLength > buf.byteLength) {
        output.reject(new ProtocolError(`Overread: ${received.byteLength}/${buf.byteLength} bytes`))
      }

      if (received.byteLength < buf.byteLength) {
        output.reject(new UnexpectedEOFError(`Underread: ${received.byteLength}/${buf.byteLength} bytes`))
      }

      output.resolve(received)
    })

    log('sending %d bytes', buf.byteLength)
    const sendMore = stream.send(buf)

    if (!sendMore) {
      await pEvent(stream, 'drain', {
        rejectionEvents: [
          'close'
        ],
        signal: options?.signal
      })
    }

    await stream.close(options)

    return output.promise
  }
}
