import { HalfCloseableDuplex } from './half-closeable-duplex.ts'
import type { HalfCloseableDuplexInit } from './half-closeable-duplex.ts'
import type { AbortOptions, ComponentLogger, CounterGroup, Direction, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AbstractMultiaddrConnectionComponents {
  logger: ComponentLogger
}

export interface AbstractMultiaddrConnectionInit extends Omit<HalfCloseableDuplexInit, 'log'> {
  remoteAddr: Multiaddr
  direction: Direction
  name: string
  closeTimeout?: number
  inactivityTimeout?: number
  localAddr?: Multiaddr
  metricPrefix?: string
  metrics?: CounterGroup
}

export abstract class AbstractMultiaddrConnection extends HalfCloseableDuplex implements MultiaddrConnection {
  public remoteAddr: Multiaddr
  public direction: Direction

  private metricPrefix: string
  private metrics?: CounterGroup

  constructor (components: AbstractMultiaddrConnectionComponents, init: AbstractMultiaddrConnectionInit) {
    super({
      ...init,
      log: components.logger.forComponent(`libp2p:${init.name}:connection`),
      onEnd: () => {
        this.metrics?.increment({ [`${this.metricPrefix}end`]: true })
        init.onEnd?.()
      },
      onAbort: (err: Error) => {
        this.metrics?.increment({ [`${this.metricPrefix}abort`]: true })
        init.onAbort?.(err)
      },
      onTimeout: () => {
        this.metrics?.increment({ [`${this.metricPrefix}timeout`]: true })
        init.onTimeout?.()
      }
    })

    this.metricPrefix = init.metricPrefix ?? ''
    this.metrics = init.metrics
    this.direction = init.direction
    this.remoteAddr = init.remoteAddr
  }

  sendCloseWrite (options?: AbortOptions): void | Promise<void> {
    // Multiaddr connections don't support being half-closed
    if (this.readStatus !== 'ready') {
      return this.sendClose(options)
    }
  }

  sendCloseRead (options?: AbortOptions): void | Promise<void> {
    // Multiaddr connections don't support being half-closed
    if (this.writeStatus !== 'ready' && this.writeStatus !== 'writing') {
      return this.sendClose(options)
    }
  }

  abstract sendClose (options?: AbortOptions): void | Promise<void>
}
