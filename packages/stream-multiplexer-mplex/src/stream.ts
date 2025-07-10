import { AbstractStream } from '@libp2p/utils/abstract-stream'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MAX_MSG_SIZE } from './decode.js'
import { InitiatorMessageTypes, ReceiverMessageTypes } from './message-types.js'
import type { Message } from './message-types.js'
import type { Logger } from '@libp2p/interface'
import type { AbstractStreamInit } from '@libp2p/utils/abstract-stream'

export interface Options {
  id: number
  send(msg: Message): Promise<void>
  log: Logger
  name?: string
  onEnd?(err?: Error): void
  type?: 'initiator' | 'receiver'
  maxMsgSize?: number
}

interface MplexStreamInit extends AbstractStreamInit {
  streamId: number
  name: string
  send(msg: Message): Promise<void>

  /**
   * The maximum allowable data size, any data larger than this will be
   * chunked and sent in multiple data messages
   */
  maxDataSize: number
}

export class MplexStream extends AbstractStream {
  private readonly name: string
  private readonly streamId: number
  private readonly send: (msg: Message) => Promise<void>
  private readonly types: Record<string, number>
  private readonly maxDataSize: number

  constructor (init: MplexStreamInit) {
    super(init)

    this.types = init.direction === 'outbound' ? InitiatorMessageTypes : ReceiverMessageTypes
    this.send = init.send
    this.name = init.name
    this.streamId = init.streamId
    this.maxDataSize = init.maxDataSize
  }

  async sendNewStream (): Promise<void> {
    await this.send({ id: this.streamId, type: InitiatorMessageTypes.NEW_STREAM, data: new Uint8ArrayList(uint8ArrayFromString(this.name)) })
  }

  async sendData (data: Uint8ArrayList): Promise<void> {
    data = data.sublist()

    while (data.byteLength > 0) {
      const toSend = Math.min(data.byteLength, this.maxDataSize)
      await this.send({
        id: this.streamId,
        type: this.types.MESSAGE,
        data: data.sublist(0, toSend)
      })

      data.consume(toSend)
    }
  }

  async sendReset (): Promise<void> {
    await this.send({ id: this.streamId, type: this.types.RESET })
  }

  async sendCloseWrite (): Promise<void> {
    await this.send({ id: this.streamId, type: this.types.CLOSE })
  }

  async sendCloseRead (): Promise<void> {
    // mplex does not support close read, only close write
  }
}

export function createStream (options: Options): MplexStream {
  const { id, name, send, onEnd, type = 'initiator', maxMsgSize = MAX_MSG_SIZE } = options
  const direction = type === 'initiator' ? 'outbound' : 'inbound'

  return new MplexStream({
    id: type === 'initiator' ? (`i${id}`) : `r${id}`,
    streamId: id,
    name: `${name ?? id}`,
    direction,
    maxDataSize: maxMsgSize,
    onEnd,
    send,
    log: options.log.newScope(`${direction}:${id}`)
  })
}
