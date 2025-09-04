import { ListenError } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { nanoid } from 'nanoid'
import { MemoryConnection, connections } from './connections.js'
import type { MemoryTransportComponents, MemoryTransportInit } from './index.js'
import type { Listener, CreateListenerOptions, ListenerEvents, MultiaddrConnection, UpgraderOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface MemoryTransportListenerInit extends CreateListenerOptions, MemoryTransportInit {
  upgraderOptions?: UpgraderOptions
}

export class MemoryTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private listenAddr?: Multiaddr
  private connection?: MemoryConnection
  private readonly components: MemoryTransportComponents
  private readonly init: MemoryTransportListenerInit
  private readonly shutdownController: AbortController

  constructor (components: MemoryTransportComponents, init: MemoryTransportListenerInit) {
    super()

    this.components = components
    this.init = init
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
  }

  async listen (ma: Multiaddr): Promise<void> {
    const components = ma.getComponents()
    const value = components[0]?.value

    const address = `/memory/${value ?? nanoid()}`

    if (value != null && connections.has(address)) {
      throw new ListenError(`Memory address ${address} already in use`)
    }

    this.connection = new MemoryConnection(this.components, {
      ...this.init,
      onConnection: this.onConnection.bind(this),
      address
    })
    this.listenAddr = multiaddr(address)

    connections.set(address, this.connection)

    queueMicrotask(() => {
      this.safeDispatchEvent('listening')
    })
  }

  onConnection (maConn: MultiaddrConnection): void {
    this.init.upgrader.upgradeInbound(maConn, {
      ...this.init.upgraderOptions,
      signal: this.shutdownController.signal
    })
      .catch(err => {
        maConn.abort(err)
      })
  }

  getAddrs (): Multiaddr[] {
    if (this.listenAddr == null) {
      return []
    }

    return [
      this.listenAddr
    ]
  }

  updateAnnounceAddrs (): void {

  }

  async close (): Promise<void> {
    this.connection?.close()

    if (this.listenAddr != null) {
      connections.delete(this.listenAddr.toString())
    }

    this.shutdownController.abort()

    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }
}
