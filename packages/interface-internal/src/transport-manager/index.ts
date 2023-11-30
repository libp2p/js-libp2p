import type { Connection, Listener, Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface TransportManager {
  add(transport: Transport): void
  dial(ma: Multiaddr, options?: any): Promise<Connection>
  getAddrs(): Multiaddr[]
  getTransports(): Transport[]
  getListeners(): Listener[]
  transportForMultiaddr(ma: Multiaddr): Transport | undefined
  listen(addrs: Multiaddr[]): Promise<void>
  remove(key: string): Promise<void>
  removeAll(): Promise<void>
}
