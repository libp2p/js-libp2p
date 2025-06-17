import { byteStream } from 'it-byte-stream'
import { pipe } from 'it-pipe'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import type { Echo as EchoInterface, EchoComponents, EchoInit } from './index.js'
import type { AbortOptions, Logger, PeerId, Startable } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * A simple echo stream, any data received will be sent back to the sender
 */
export class Echo implements Startable, EchoInterface {
  public readonly protocol: string
  private readonly components: EchoComponents
  private started: boolean
  private readonly init: EchoInit
  private readonly log: Logger

  constructor (components: EchoComponents, init: EchoInit = {}) {
    this.log = components.logger.forComponent('libp2p:echo')
    this.started = false
    this.components = components
    this.protocol = `/${[init.protocolPrefix, PROTOCOL_NAME, PROTOCOL_VERSION].filter(Boolean).join('/')}`
    this.init = init
  }

  readonly [Symbol.toStringTag] = '@libp2p/echo'

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, ({ stream }) => {
      void pipe(stream, stream)
        .catch((err: any) => {
          this.log.error('error piping stream', err)
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

  async echo (peer: PeerId | Multiaddr | Multiaddr[], buf: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    const conn = await this.components.connectionManager.openConnection(peer, options)
    const stream = await conn.newStream(this.protocol, {
      ...this.init,
      ...options
    })
    const bytes = byteStream(stream)

    const [, output] = await Promise.all([
      bytes.write(buf, options),
      bytes.read({
        ...options,
        bytes: buf.byteLength
      })
    ])

    await stream.close(options)

    return output.subarray()
  }
}
