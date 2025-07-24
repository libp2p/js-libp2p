import { HalfCloseableDuplex } from './half-closeable-duplex.ts'
import { isPromise } from './is-promise.ts'
import type { HalfCloseableDuplexInit } from './half-closeable-duplex.ts'
import type { AbortOptions, Direction, Stream } from '@libp2p/interface'

export interface AbstractStreamInit extends HalfCloseableDuplexInit {
  /**
   * A unique identifier for this stream
   */
  id: string

  /**
   * The stream direction
   */
  direction: Direction

  /**
   * User specific stream metadata
   */
  metadata?: Record<string, unknown>
}

export abstract class AbstractStream extends HalfCloseableDuplex implements Stream {
  public id: string
  public direction: Direction
  public protocol?: string
  public metadata: Record<string, unknown>

  constructor (init: AbstractStreamInit) {
    super({
      ...init,
      onSink: async (options) => {
        if (this.direction === 'outbound') { // If initiator, open a new stream
          const res = this.sendNewStream(options)

          if (isPromise(res)) {
            await res
          }
        }
      }
    })

    this.id = init.id
    this.metadata = init.metadata ?? {}
    this.direction = init.direction
  }

  /**
   * Send a message to the remote muxer informing them a new stream is being
   * opened
   */
  abstract sendNewStream (options?: AbortOptions): void | Promise<void>
}
