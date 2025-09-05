import { AbstractStream } from '@libp2p/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_MSG_SIZE } from './decode.js'
import { encode } from './encode.ts'
import { InitiatorMessageTypes, ReceiverMessageTypes } from './message-types.js'
import type { MplexStreamMuxer } from './mplex.ts'
import type { Logger, MessageStreamDirection } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { AbortOptions } from 'it-pushable'

export interface Options {
  id: number
  log: Logger
  direction: MessageStreamDirection
  maxMsgSize?: number
  muxer: MplexStreamMuxer
}

interface MplexStreamInit extends AbstractStreamInit {
  maxDataSize: number
  muxer: MplexStreamMuxer
  direction: MessageStreamDirection
}

export class MplexStream extends AbstractStream {
  public readonly streamId: number
  private readonly types: Record<string, number>
  private readonly maxDataSize: number
  private readonly muxer: MplexStreamMuxer

  constructor (init: MplexStreamInit) {
    super(init)

    this.types = init.direction === 'outbound' ? InitiatorMessageTypes : ReceiverMessageTypes
    this.maxDataSize = init.maxDataSize
    this.muxer = init.muxer
    this.streamId = parseInt(this.id.substring(1))

    if (init.direction === 'outbound') {
      // open the stream on the receiver end. do this in a microtask so the
      // stream gets added to the streams array by the muxer superclass before
      // we send the NEW_STREAM message, otherwise we create a race condition
      // whereby we can receive the stream messages before the stream is added
      // to the streams list
      queueMicrotask(() => {
        this.muxer.send(
          encode({
            id: this.streamId,
            type: InitiatorMessageTypes.NEW_STREAM,
            data: new Uint8ArrayList(uint8ArrayFromString(this.id))
          })
        )
      })
    }
  }

  sendData (data: Uint8ArrayList): SendResult {
    const list = new Uint8ArrayList()
    const sentBytes = data.byteLength

    while (data.byteLength > 0) {
      const toSend = Math.min(data.byteLength, this.maxDataSize)
      const slice = data.sublist(0, toSend)
      data = data.sublist(toSend)

      list.append(
        encode({
          id: this.streamId,
          type: this.types.MESSAGE,
          data: slice
        })
      )
    }

    return {
      sentBytes,
      canSendMore: this.muxer.send(list)
    }
  }

  sendReset (): boolean {
    return this.muxer.send(
      encode({
        id: this.streamId,
        type: this.types.RESET
      })
    )
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.muxer.send(
      encode({
        id: this.streamId,
        type: this.types.CLOSE
      })
    )
    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
    // mplex does not support close read, only close write
  }

  sendPause (): void {
    // mplex does not support backpressure
  }

  sendResume (): void {
    // mplex does not support backpressure
  }
}

export function createStream (options: Options): MplexStream {
  const { id, muxer, direction, maxMsgSize = MAX_MSG_SIZE } = options

  return new MplexStream({
    ...options,
    id: direction === 'outbound' ? (`i${id}`) : `r${id}`,
    direction,
    maxDataSize: maxMsgSize,
    muxer,
    log: options.log.newScope(`${direction}:${id}`),
    protocol: ''
  })
}
