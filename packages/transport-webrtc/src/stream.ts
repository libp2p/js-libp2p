import { CodeError } from '@libp2p/interface/errors'
import { AbstractStream, type AbstractStreamInit } from '@libp2p/interface/stream-muxer/stream'
import { logger } from '@libp2p/logger'
import * as lengthPrefixed from 'it-length-prefixed'
import { type Pushable, pushable } from 'it-pushable'
import { pEvent, TimeoutError } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { Message } from './pb/message.js'
import type { Direction, RawStream } from '@libp2p/interface/connection'

const log = logger('libp2p:webrtc:stream')

export interface DataChannelOpts {
  maxMessageSize: number
  maxBufferedAmount: number
  bufferedAmountLowEventTimeout: number
}

export interface WebRTCStreamInit extends AbstractStreamInit {
  /**
   * The network channel used for bidirectional peer-to-peer transfers of
   * arbitrary data
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
   */
  channel: RTCDataChannel

  dataChannelOptions?: Partial<DataChannelOpts>
}

// Max message size that can be sent to the DataChannel
const MAX_MESSAGE_SIZE = 16 * 1024

// How much can be buffered to the DataChannel at once
const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024

// How long time we wait for the 'bufferedamountlow' event to be emitted
const BUFFERED_AMOUNT_LOW_TIMEOUT = 30 * 1000

// protobuf field definition overhead
const PROTOBUF_OVERHEAD = 3

class WebRTCStream extends AbstractStream {
  /**
   * The data channel used to send and receive data
   */
  private readonly channel: RTCDataChannel

  /**
   * Data channel options
   */
  private readonly dataChannelOptions: DataChannelOpts

  /**
   * push data from the underlying datachannel to the length prefix decoder
   * and then the protobuf decoder.
   */
  private readonly incomingData: Pushable<Uint8Array>

  private messageQueue?: Uint8ArrayList

  constructor (init: WebRTCStreamInit) {
    super(init)

    this.channel = init.channel
    this.channel.binaryType = 'arraybuffer'
    this.incomingData = pushable()
    this.messageQueue = new Uint8ArrayList()
    this.dataChannelOptions = {
      bufferedAmountLowEventTimeout: init.dataChannelOptions?.bufferedAmountLowEventTimeout ?? BUFFERED_AMOUNT_LOW_TIMEOUT,
      maxBufferedAmount: init.dataChannelOptions?.maxBufferedAmount ?? MAX_BUFFERED_AMOUNT,
      maxMessageSize: init.dataChannelOptions?.maxMessageSize ?? MAX_MESSAGE_SIZE
    }

    // set up initial state
    switch (this.channel.readyState) {
      case 'open':
        break

      case 'closed':
      case 'closing':
        if (this.timeline.close === undefined || this.timeline.close === 0) {
          this.timeline.close = Date.now()
        }
        break
      case 'connecting':
        // noop
        break

      default:
        log.error('unknown datachannel state %s', this.channel.readyState)
        throw new CodeError('Unknown datachannel state', 'ERR_INVALID_STATE')
    }

    // handle RTCDataChannel events
    this.channel.onopen = (_evt) => {
      this.timeline.open = new Date().getTime()

      if (this.messageQueue != null) {
        // send any queued messages
        this._sendMessage(this.messageQueue)
          .catch(err => {
            this.abort(err)
          })
        this.messageQueue = undefined
      }
    }

    this.channel.onclose = async (_evt) => {
      await this.close()
    }

    this.channel.onerror = (evt) => {
      const err = (evt as RTCErrorEvent).error
      this.abort(err)
    }

    const self = this

    this.channel.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
      const { data } = event

      if (data === null || data.byteLength === 0) {
        return
      }

      this.incomingData.push(new Uint8Array(data, 0, data.byteLength))
    }

    // pipe framed protobuf messages through a length prefixed decoder, and
    // surface data from the `Message.message` field through a source.
    Promise.resolve().then(async () => {
      for await (const buf of lengthPrefixed.decode(this.incomingData)) {
        const message = await self.processIncomingProtobuf(buf.subarray())

        if (message != null) {
          self.sourcePush(new Uint8ArrayList(message))
        }
      }
    })
      .catch(err => {
        log.error('error processing incoming data channel messages', err)
      })
  }

  sendNewStream (): void {
    // opening new streams is handled by WebRTC so this is a noop
  }

  async _sendMessage (data: Uint8ArrayList, checkBuffer: boolean = true): Promise<void> {
    if (checkBuffer && this.channel.bufferedAmount > this.dataChannelOptions.maxBufferedAmount) {
      try {
        await pEvent(this.channel, 'bufferedamountlow', { timeout: this.dataChannelOptions.bufferedAmountLowEventTimeout })
      } catch (err: any) {
        if (err instanceof TimeoutError) {
          this.abort(err)
          throw new Error('Timed out waiting for DataChannel buffer to clear')
        }

        throw err
      }
    }

    if (this.channel.readyState === 'closed' || this.channel.readyState === 'closing') {
      throw new CodeError('Invalid datachannel state - closed or closing', 'ERR_INVALID_STATE')
    }

    if (this.channel.readyState === 'open') {
      // send message without copying data
      for (const buf of data) {
        this.channel.send(buf)
      }
    } else if (this.channel.readyState === 'connecting') {
      // queue message for when we are open
      if (this.messageQueue == null) {
        this.messageQueue = new Uint8ArrayList()
      }

      this.messageQueue.append(data)
    } else {
      log.error('unknown datachannel state %s', this.channel.readyState)
      throw new CodeError('Unknown datachannel state', 'ERR_INVALID_STATE')
    }
  }

  async sendData (data: Uint8ArrayList): Promise<void> {
    const msgbuf = Message.encode({ message: data.subarray() })
    const sendbuf = lengthPrefixed.encode.single(msgbuf)

    await this._sendMessage(sendbuf)
  }

  async sendReset (): Promise<void> {
    await this._sendFlag(Message.Flag.RESET)
  }

  async sendCloseWrite (): Promise<void> {
    await this._sendFlag(Message.Flag.FIN)
  }

  async sendCloseRead (): Promise<void> {
    await this._sendFlag(Message.Flag.STOP_SENDING)
  }

  /**
   * Handle incoming
   */
  private async processIncomingProtobuf (buffer: Uint8Array): Promise<Uint8Array | undefined> {
    const message = Message.decode(buffer)

    if (message.flag !== undefined) {
      if (message.flag === Message.Flag.FIN) {
        // We should expect no more data from the remote, stop reading
        this.incomingData.end()
        this.closeRead()
      }

      if (message.flag === Message.Flag.RESET) {
        // Stop reading and writing to the stream immediately
        this.reset()
      }

      if (message.flag === Message.Flag.STOP_SENDING) {
        // The remote has stopped reading
        await this.closeWrite()
      }
    }

    return message.message
  }

  private async _sendFlag (flag: Message.Flag): Promise<void> {
    log.trace('Sending flag: %s', flag.toString())
    const msgbuf = Message.encode({ flag })
    const prefixedBuf = lengthPrefixed.encode.single(msgbuf)

    await this._sendMessage(prefixedBuf, false)
  }
}

export interface WebRTCStreamOptions {
  /**
   * The network channel used for bidirectional peer-to-peer transfers of
   * arbitrary data
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
   */
  channel: RTCDataChannel

  /**
   * The stream direction
   */
  direction: Direction

  dataChannelOptions?: Partial<DataChannelOpts>

  maxMsgSize?: number

  onEnd?: (err?: Error | undefined) => void
}

export function createStream (options: WebRTCStreamOptions): RawStream {
  const { channel, direction, onEnd, dataChannelOptions } = options

  return new WebRTCStream({
    id: direction === 'inbound' ? (`i${channel.id}`) : `r${channel.id}`,
    direction,
    maxDataSize: (dataChannelOptions?.maxMessageSize ?? MAX_MESSAGE_SIZE) - PROTOBUF_OVERHEAD,
    dataChannelOptions,
    onEnd,
    channel
  })
}
