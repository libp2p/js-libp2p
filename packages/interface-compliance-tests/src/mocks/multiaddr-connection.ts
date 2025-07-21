import { defaultLogger } from '@libp2p/logger'
import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import { multiaddr } from '@multiformats/multiaddr'
import { abortableSource } from 'abortable-iterator'
import { byteStream } from 'it-byte-stream'
import { duplexPair } from 'it-pair/duplex'
import type { AbortOptions, MultiaddrConnection, PeerId } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ByteStream } from 'it-byte-stream'
import type { Duplex } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

interface MockMultiaddrConnectionInit extends AbstractMultiaddrConnectionInit {
  onClose?(): void
  onAbort?(err: Error): void
  source: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> & Partial<MultiaddrConnection>
}

class MockMultiaddrConnection extends AbstractMultiaddrConnection {
  private stream: ByteStream<Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> & Partial<MultiaddrConnection>>
  private onClose?: () => void

  constructor (components: AbstractMultiaddrConnectionComponents, init: MockMultiaddrConnectionInit) {
    super(components, {
      ...init,
      onAbort: (err: Error) => {
        init.onAbort?.(err)
      }
    })

    this.stream = byteStream(init.source)

    this.onClose = init.onClose

    Promise.resolve()
      .then(async () => {
        while (true) {
          const buf = await this.stream.read({
            signal: AbortSignal.timeout(init.inactivityTimeout ?? 5_000)
          })

          if (buf == null) {
            this.remoteCloseWrite()
            break
          }

          this.sourcePush(buf)
        }
      })
      .catch(err => {
        this.abort(err)
      })
  }

  sendClose (): void {
    this.onClose?.()
  }

  async sendData (data: Uint8ArrayList, options?: AbortOptions): Promise<void> {
    await this.stream.write(data, options)
  }

  sendReset (options?: AbortOptions): void | Promise<void> {

  }
}

export function mockMultiaddrConnection (source: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> & Partial<MultiaddrConnection>, peerId?: PeerId): MultiaddrConnection {
  return new MockMultiaddrConnection({
    logger: defaultLogger()
  }, {
    source,
    direction: 'outbound',
    remoteAddr: multiaddr(`/ip4/127.0.0.1/tcp/4001${peerId == null ? '' : `/p2p/${peerId}`}`),
    name: 'mock-maconn'
  })
}

export interface MockMultiaddrConnPairOptions {
  addrs: Multiaddr[]
  remotePeer: PeerId
}

/**
 * Returns both sides of a mocked MultiaddrConnection
 */
export function mockMultiaddrConnPair (opts?: MockMultiaddrConnPairOptions): { inbound: MultiaddrConnection, outbound: MultiaddrConnection } {
  const controller = new AbortController()
  const [inboundStream, outboundStream] = duplexPair<Uint8Array | Uint8ArrayList>()

  const remotePeer = opts?.remotePeer
  const localAddr = opts?.addrs[0] ?? multiaddr('/ip4/123.123.123.123/tcp/1234')
  let remoteAddr = opts?.addrs[1] ?? multiaddr('/ip4/123.123.123.123/tcp/1235')

  if (remotePeer != null && !remoteAddr.toString().includes(remotePeer.toString())) {
    remoteAddr = multiaddr(`${remoteAddr}/p2p/${remotePeer}`)
  }

  const outbound = new MockMultiaddrConnection({
    logger: defaultLogger()
  }, {
    source: outboundStream,
    direction: 'outbound',
    remoteAddr,
    name: 'mock-maconn-outbound',
    onClose: () => {
      controller.abort()
    },
    onAbort: (err: Error) => {
      controller.abort(err)
    }
  })

  const inbound = new MockMultiaddrConnection({
    logger: defaultLogger()
  }, {
    source: inboundStream,
    direction: 'inbound',
    remoteAddr: localAddr,
    name: 'mock-maconn-inbound',
    onClose: () => {
      controller.abort()
    },
    onAbort: (err: Error) => {
      controller.abort(err)
    }
  })

  // Make the sources abortable so we can close them easily
  inbound.source = abortableSource(inbound.source, controller.signal)
  outbound.source = abortableSource(outbound.source, controller.signal)

  return { inbound, outbound }
}
