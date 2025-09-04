import { pEvent } from 'p-event'
import { AbstractMessageStream } from './abstract-message-stream.ts'
import type { MessageStreamInit } from './abstract-message-stream.ts'
import type { CounterGroup, Logger, MultiaddrConnection, MessageStreamDirection, AbortOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AbstractMultiaddrConnectionInit extends Omit<MessageStreamInit, 'log'> {
  remoteAddr: Multiaddr
  direction: MessageStreamDirection
  log: Logger
  inactivityTimeout?: number
  localAddr?: Multiaddr
  metricPrefix?: string
  metrics?: CounterGroup
}

export abstract class AbstractMultiaddrConnection extends AbstractMessageStream implements MultiaddrConnection {
  public remoteAddr: Multiaddr

  private metricPrefix: string
  private metrics?: CounterGroup

  constructor (init: AbstractMultiaddrConnectionInit) {
    super(init)

    this.metricPrefix = init.metricPrefix ?? ''
    this.metrics = init.metrics
    this.remoteAddr = init.remoteAddr

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

  async close (options?: AbortOptions): Promise<void> {
    if (this.status !== 'open') {
      return
    }

    this.status = 'closing'
    this.writeStatus = 'closing'
    this.remoteWriteStatus = 'closing'
    this.remoteReadStatus = 'closing'

    // if we are currently sending data, wait for all the data to be written
    // into the underlying transport
    if (this.sendingData || this.writeBuffer.byteLength > 0) {
      this.log('waiting for write queue to become idle before closing writable end of stream, %d unsent bytes', this.writeBuffer.byteLength)
      await pEvent(this, 'idle', {
        ...options,
        rejectionEvents: [
          'close'
        ]
      })
    }

    // now that the underlying transport has all the data, if the buffer is full
    // wait for it to be emptied
    if (this.writableNeedsDrain) {
      this.log('waiting for write queue to drain before closing writable end of stream, %d unsent bytes', this.writeBuffer.byteLength)
      await pEvent(this, 'drain', {
        ...options,
        rejectionEvents: [
          'close'
        ]
      })
    }

    await this.sendClose(options)

    this.onTransportClosed()
  }

  /**
   * Wait for any unsent data to be written to the underlying resource, then
   * close the resource and resolve the returned promise
   */
  abstract sendClose (options?: AbortOptions): Promise<void>
}
