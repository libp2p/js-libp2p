import { ProtocolError } from '@libp2p/interface'
import { UnexpectedEOFError } from '@libp2p/utils'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import type { Echo as EchoInterface, EchoComponents, EchoInit } from './index.js'
import type { PeerId, Startable } from '@libp2p/interface'
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
    await this.components.registrar.handle(this.protocol, async (stream, connection) => {
      const log = stream.log.newScope('echo')
      const start = Date.now()
      const signal = AbortSignal.timeout(this.timeout)
      let bytes = 0

      for await (const buf of stream) {
        bytes += buf.byteLength

        if (stream.status !== 'open') {
          log('stream status changed to %s', stream.status)
          break
        }

        if (!stream.send(buf)) {
          log('waiting for stream to drain')
          await pEvent(stream, 'drain')
          log('stream drained')
        }
      }

      log('echoed %d bytes in %dms', bytes, Date.now() - start)

      await stream.close({
        signal
      })
    }, {
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

  async echo (peer: PeerId | Multiaddr | Multiaddr[], buf: Uint8Array, options?: OpenConnectionOptions): Promise<Uint8Array> {
    const stream = await this.components.connectionManager.openStream(peer, this.protocol, {
      ...this.init,
      ...options
    })

    const log = stream.log.newScope('echo')

    const received = new Uint8ArrayList()
    const output = Promise.withResolvers<Uint8Array>()

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

      output.resolve(received.subarray())
    })

    log('sending %d bytes', buf.byteLength)
    stream.send(buf)
    await stream.close(options)

    return output.promise
  }
}
