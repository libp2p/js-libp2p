import { serviceCapabilities, transportSymbol } from '@libp2p/interface'
import type { QUICDialEvents } from './index.ts'
import type { Connection, Transport, Listener } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class QUIC implements Transport<QUICDialEvents> {
  constructor () {
    throw new Error('QUIC connections are not possible in browsers')
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/quic'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (): Promise<Connection> {
    throw new Error('QUIC connections are not possible in browsers')
  }

  createListener (): Listener {
    throw new Error('QUIC connections are not possible in browsers')
  }

  listenFilter (): Multiaddr[] {
    return []
  }

  dialFilter (): Multiaddr[] {
    return []
  }
}
