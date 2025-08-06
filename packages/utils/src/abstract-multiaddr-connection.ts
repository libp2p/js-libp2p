import { AbstractMessageStream } from './abstract-message-stream.ts'
import type { MessageStreamInit } from './abstract-message-stream.ts'
import type { CounterGroup, Logger, MultiaddrConnection, StreamDirection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AbstractMultiaddrConnectionInit extends Omit<MessageStreamInit, 'log'> {
  remoteAddr: Multiaddr
  direction: StreamDirection
  log: Logger
  inactivityTimeout?: number
  localAddr?: Multiaddr
  metricPrefix?: string
  metrics?: CounterGroup
}

export abstract class AbstractMultiaddrConnection extends AbstractMessageStream implements MultiaddrConnection {
  public remoteAddr: Multiaddr
  public direction: StreamDirection

  private metricPrefix: string
  private metrics?: CounterGroup

  constructor (init: AbstractMultiaddrConnectionInit) {
    super(init)

    this.metricPrefix = init.metricPrefix ?? ''
    this.metrics = init.metrics
    this.remoteAddr = init.remoteAddr
    this.direction = init.direction

    this.addEventListener('close', (evt) => {
      this.metrics?.increment({ [`${this.metricPrefix}end`]: true })

      if (evt.error != null) {
        if (evt.local) {
          this.metrics?.increment({ [`${this.metricPrefix}abort`]: true })
        } else {
          this.metrics?.increment({ [`${this.metricPrefix}reset`]: true })
        }
      } else {
        if (evt.local) {
          this.metrics?.increment({ [`${this.metricPrefix}_local_close`]: true })
        } else {
          this.metrics?.increment({ [`${this.metricPrefix}_remote_close`]: true })
        }
      }
    })
  }
}
