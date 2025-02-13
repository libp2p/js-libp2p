import { serviceCapabilities, transportSymbol } from '@libp2p/interface'
import type { TCPDialEvents } from './index.js'
import type { Connection, Transport, Listener } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class TCP implements Transport<TCPDialEvents> {
  constructor () {
    throw new Error('TCP connections are not possible in browsers')
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/tcp'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (): Promise<Connection> {
    throw new Error('TCP connections are not possible in browsers')
  }

  createListener (): Listener {
    throw new Error('TCP connections are not possible in browsers')
  }

  listenFilter (): Multiaddr[] {
    return []
  }

  dialFilter (): Multiaddr[] {
    return []
  }
}
