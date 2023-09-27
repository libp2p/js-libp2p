import { CodeError } from '@libp2p/interface/errors'
import { AbstractStream, type AbstractStreamInit } from '@libp2p/interface/stream-muxer/stream'
import { logger } from '@libp2p/logger'
import * as lengthPrefixed from 'it-length-prefixed'
import { type Pushable, pushable } from 'it-pushable'
import pDefer from 'p-defer'
import { pEvent, TimeoutError } from 'p-event'
import pTimeout from 'p-timeout'
import { Uint8ArrayList } from 'uint8arraylist'
import { Message } from './pb/message.js'
import type { DataChannelOptions } from './index.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Direction } from '@libp2p/interface/connection'
import type { DeferredPromise } from 'p-defer'

export interface WebRTCStreamInit extends AbstractStreamInit, DataChannelOptions {
  /**
   * The network channel used for bidirectional peer-to-peer transfers of
   * arbitrary data
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
   */
  channel: RTCDataChannel
}

/**
 * How much can be buffered to the DataChannel at once
 */
export const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024

/**
 * How long time we wait for the 'bufferedamountlow' event to be emitted
 */
export const BUFFERED_AMOUNT_LOW_TIMEOUT = 30 * 1000

/**
 * protobuf field definition overhead
 */
export const PROTOBUF_OVERHEAD = 5

/**
 * Length of varint, in bytes
 */
export const VARINT_LENGTH = 2

/**
 * Max message size that can be sent to the DataChannel
 */
export const MAX_MESSAGE_SIZE = 16 * 1024

/**
 * When closing streams we send a FIN then wait for the remote to
 * reply with a FIN_ACK. If that does not happen within this timeout
 * we close the stream anyway.
 */
export const FIN_ACK_TIMEOUT = 5000

export class WebRTCStream extends AbstractStream {
  /**
   * The data channel used to send and receive data
   */
  private readonly channel: RTCDataChannel

  /**
   * push data from the underlying datachannel to the length prefix decoder
   * and then the protobuf decoder.
   */
  private readonly incomingData: Pushable<Uint8Array>

  private messageQueue?: Uint8ArrayList

  private readonly maxBufferedAmount: number

  private readonly bufferedAmountLowEventTimeout: number

  /**
   * The maximum size of a message in bytes
   */
  private readonly maxMessageSize: number

  /**
   * When this promise is resolved, the remote has sent us a FIN flag
   */
  private readonly receiveFinAck: DeferredPromise<void>
  private readonly finAckTimeout: number

  constructor (init: WebRTCStreamInit) {
    // override onEnd to send/receive FIN_ACK before closing the stream
    const originalOnEnd = init.onEnd
    init.onEnd = (err?: Error): void => {
      this.log.trace('received FIN, sending FIN_ACK', this.status)
      this._sendFlag(Message.Flag.FIN_ACK)
        .catch(err => {
          this.log.error('error sending FIN_ACK', err)
        })
        .then(async () => {
          await pTimeout(this.receiveFinAck.promise, {
            milliseconds: this.finAckTimeout
          })
        })
        .catch(err => {
          this.log.error('error receiving FIN_ACK', err)
        })
        .finally(() => {
          originalOnEnd?.(err)
        })
    }

    super(init)

    this.channel = init.channel
    this.channel.binaryType = 'arraybuffer'
    this.incomingData = pushable()
    this.messageQueue = new Uint8ArrayList()
    this.bufferedAmountLowEventTimeout = init.bufferedAmountLowEventTimeout ?? BUFFERED_AMOUNT_LOW_TIMEOUT
    this.maxBufferedAmount = init.maxBufferedAmount ?? MAX_BUFFERED_AMOUNT
    this.maxMessageSize = (init.maxMessageSize ?? MAX_MESSAGE_SIZE) - PROTOBUF_OVERHEAD - VARINT_LENGTH
    this.receiveFinAck = pDefer()
    this.finAckTimeout = init.closeTimeout ?? FIN_ACK_TIMEOUT

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
        this.log.error('unknown datachannel state %s', this.channel.readyState)
        throw new CodeError('Unknown datachannel state', 'ERR_INVALID_STATE')
    }

    // handle RTCDataChannel events
    this.channel.onopen = (_evt) => {
      this.timeline.open = new Date().getTime()

      if (this.messageQueue != null && this.messageQueue.byteLength > 0) {
        this.log.trace('dataChannel opened, sending queued messages', this.messageQueue.byteLength, this.channel.readyState)

        // send any queued messages
        this._sendMessage(this.messageQueue)
          .catch(err => {
            this.log.error('error sending queued messages', err)
            this.abort(err)
          })
      }

      this.messageQueue = undefined
    }

    this.channel.onclose = (_evt) => {
      void this.close().catch(err => {
        this.log.error('error closing stream after channel closed', err)
      })
    }

    this.channel.onerror = (evt) => {
      const err = (evt as RTCErrorEvent).error
      this.abort(err)
    }

    this.channel.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
      const { data } = event

      if (data === null || data.byteLength === 0) {
        return
      }

      this.incomingData.push(new Uint8Array(data, 0, data.byteLength))
    }

    const self = this

    // pipe framed protobuf messages through a length prefixed decoder, and
    // surface data from the `Message.message` field through a source.
    Promise.resolve().then(async () => {
      for await (const buf of lengthPrefixed.decode(this.incomingData)) {
        const message = self.processIncomingProtobuf(buf.subarray())

        if (message != null) {
          self.sourcePush(new Uint8ArrayList(message))
        }
      }
    })
      .catch(err => {
        this.log.error('error processing incoming data channel messages', err)
      })
  }

  sendNewStream (): void {
    // opening new streams is handled by WebRTC so this is a noop
  }

  async _sendMessage (data: Uint8ArrayList, checkBuffer: boolean = true): Promise<void> {
    if (checkBuffer && this.channel.bufferedAmount > this.maxBufferedAmount) {
      try {
        await pEvent(this.channel, 'bufferedamountlow', { timeout: this.bufferedAmountLowEventTimeout })
      } catch (err: any) {
        if (err instanceof TimeoutError) {
          throw new Error('Timed out waiting for DataChannel buffer to clear')
        }

        throw err
      }
    }

    if (this.channel.readyState === 'closed' || this.channel.readyState === 'closing') {
      throw new CodeError(`Invalid datachannel state - ${this.channel.readyState}`, 'ERR_INVALID_STATE')
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
      this.log.error('unknown datachannel state %s', this.channel.readyState)
      throw new CodeError('Unknown datachannel state', 'ERR_INVALID_STATE')
    }
  }

  async sendData (data: Uint8ArrayList): Promise<void> {
    // sending messages is an async operation so use a copy of the list as it
    // may be changed beneath us
    data = data.sublist()

    while (data.byteLength > 0) {
      const toSend = Math.min(data.byteLength, this.maxMessageSize)
      const buf = data.subarray(0, toSend)
      const msgbuf = Message.encode({ message: buf })
      const sendbuf = lengthPrefixed.encode.single(msgbuf)
      await this._sendMessage(sendbuf)

      data.consume(toSend)
    }
  }

  async sendReset (): Promise<void> {
    await this._sendFlag(Message.Flag.RESET)
  }

  async sendCloseWrite (options: AbortOptions): Promise<void> {
    if (this.channel.readyState === 'closed') {
      return
    }

    this.log.trace('send FIN')
    await this._sendFlag(Message.Flag.FIN)
  }

  async sendCloseRead (): Promise<void> {
    await this._sendFlag(Message.Flag.STOP_SENDING)
  }

  /**
   * Handle incoming
   */
  private processIncomingProtobuf (buffer: Uint8Array): Uint8Array | undefined {
    const message = Message.decode(buffer)

    if (message.flag !== undefined) {
      this.log.trace('incoming flag', message.flag)

      if (message.flag === Message.Flag.FIN) {
        // We should expect no more data from the remote, stop reading
        this.incomingData.end()
        this.remoteCloseWrite()
      }

      if (message.flag === Message.Flag.RESET) {
        // Stop reading and writing to the stream immediately
        this.reset()
      }

      if (message.flag === Message.Flag.STOP_SENDING) {
        // The remote has stopped reading
        this.remoteCloseRead()
      }

      if (message.flag === Message.Flag.FIN_ACK) {
        this.log.trace('received FIN_ACK')
        this.receiveFinAck.resolve()
      }
    }

    return message.message
  }

  private async _sendFlag (flag: Message.Flag): Promise<void> {
    this.log.trace('sending flag: %s', flag.toString())
    const msgbuf = Message.encode({ flag })
    const prefixedBuf = lengthPrefixed.encode.single(msgbuf)

    await this._sendMessage(prefixedBuf, false)
  }
}

export interface WebRTCStreamOptions extends DataChannelOptions {
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

  /**
   * A callback invoked when the channel ends
   */
  onEnd?: (err?: Error | undefined) => void
}

export function createStream (options: WebRTCStreamOptions): WebRTCStream {
  const { channel, direction } = options

  return new WebRTCStream({
    id: direction === 'inbound' ? (`i${channel.id}`) : `r${channel.id}`,
    log: logger(`libp2p:webrtc:stream:${direction}:${channel.id}`),
    ...options
  })
}
