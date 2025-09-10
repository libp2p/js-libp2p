import { StreamStateError } from '@libp2p/interface'
import { AbstractStream } from '@libp2p/utils'
import * as lengthPrefixed from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { MAX_BUFFERED_AMOUNT, MAX_MESSAGE_SIZE, PROTOBUF_OVERHEAD } from './constants.js'
import { Message } from './private-to-public/pb/message.js'
import type { DataChannelOptions } from './index.js'
import type { AbortOptions, MessageStreamDirection, Logger } from '@libp2p/interface'
import type { AbstractStreamInit, SendResult } from '@libp2p/utils'
import type { Pushable } from 'it-pushable'

export interface WebRTCStreamInit extends AbstractStreamInit, DataChannelOptions {
  /**
   * The network channel used for bidirectional peer-to-peer transfers of
   * arbitrary data
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel}
   */
  channel: RTCDataChannel

  log: Logger

  connection: RTCPeerConnection
}

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
  private readonly maxBufferedAmount: number
  private readonly receivedFinAck: PromiseWithResolvers<void>
  private readonly connection: RTCPeerConnection

  constructor (init: WebRTCStreamInit) {
    super({
      ...init,
      maxMessageSize: (init.maxMessageSize ?? MAX_MESSAGE_SIZE) - PROTOBUF_OVERHEAD
    })

    this.channel = init.channel
    this.channel.binaryType = 'arraybuffer'
    this.incomingData = pushable<Uint8Array>()
    this.maxBufferedAmount = init.maxBufferedAmount ?? MAX_BUFFERED_AMOUNT
    this.receivedFinAck = Promise.withResolvers()
    this.connection = init.connection

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
        throw new StreamStateError('Unknown datachannel state')
    }

    // handle RTCDataChannel events
    this.channel.onclose = () => {
      this.log.trace('received datachannel close event, connection status %s', this.connection.connectionState)

      this.onRemoteCloseWrite()
      this.onTransportClosed()
    }

    this.channel.onclosing = () => {
      this.log.trace('received datachannel closing event')
    }

    this.channel.onerror = (evt) => {
      this.log.trace('received datachannel error event')

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

    // dispatch drain event when the buffered amount drops to zero
    this.channel.bufferedAmountLowThreshold = 0
    this.channel.onbufferedamountlow = () => {
      this.safeDispatchEvent('drain')
    }

    const self = this

    // pipe framed protobuf messages through a length prefixed decoder, and
    // surface data from the `Message.message` field through a source.
    Promise.resolve().then(async () => {
      for await (const buf of lengthPrefixed.decode(this.incomingData)) {
        const message = self.processIncomingProtobuf(buf)

        if (message != null) {
          self.onData(new Uint8ArrayList(message))
        }
      }
    })
      .catch(err => {
        this.log.error('error processing incoming data channel messages', err)
      })

    // clean up the datachannel when both ends have sent a FIN_ACK
    this.receivedFinAck.promise.then(() => {
      if (this.remoteWriteStatus === 'closed' && this.writeStatus === 'closed') {
        this.log('closing datachannel as FIN_ACK was received and remote has already closed its writable end')
        this.channel.close()
      }
    })
  }

  sendNewStream (): void {
    // opening new streams is handled by WebRTC so this is a noop
  }

  _sendMessage (data: Uint8ArrayList): void {
    if (this.channel.readyState === 'closed' || this.channel.readyState === 'closing') {
      throw new StreamStateError(`Invalid datachannel state - ${this.channel.readyState}`)
    }

    try {
      this.log.trace('sending message, channel state "%s", connection state "%s", ', this.channel.readyState, this.connection.connectionState, this.connection.signalingState, this.connection.iceGatheringState, this.connection.iceConnectionState)
      // send message without copying data
      for (const buf of data) {
        this.log.trace('will send %d with buffered amount %d/%d', buf.byteLength, this.channel.bufferedAmount, this.maxBufferedAmount)
        this.channel.send(buf)
        this.log.trace('did send %d with buffered amount %d/%d', buf.byteLength, this.channel.bufferedAmount, this.maxBufferedAmount)
      }
    } catch (err: any) {
      this.log.error('error while sending message - %e', err)
    }
  }

  sendData (data: Uint8ArrayList): SendResult {
    const messageBuf = Message.encode({
      message: data.subarray()
    })
    const prefixedBuf = lengthPrefixed.encode.single(messageBuf)
    this._sendMessage(prefixedBuf)

    return {
      sentBytes: data.byteLength,
      canSendMore: this.channel.bufferedAmount < this.maxBufferedAmount
    }
  }

  sendReset (): void {
    this.receivedFinAck.resolve()

    try {
      this._sendFlag(Message.Flag.RESET)
    } catch (err) {
      this.log.error('failed to send reset - %e', err)
    } finally {
      this.log('closing datachannel as have sent a reset message')
      this.channel.close()
    }
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    if (this.channel.readyState === 'open') {
      this._sendFlag(Message.Flag.FIN)
    }

    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    if (this.channel.readyState === 'open') {
      this._sendFlag(Message.Flag.STOP_SENDING)
    }

    options?.signal?.throwIfAborted()
  }

  /**
   * Handle incoming
   */
  private processIncomingProtobuf (buffer: Uint8ArrayList): Uint8Array | undefined {
    const message = Message.decode(buffer)

    if (message.flag !== undefined) {
      this.log.trace('incoming flag %s, write status "%s", read status "%s"', message.flag, this.writeStatus, this.readStatus)

      if (message.flag === Message.Flag.FIN) {
        // We should expect no more data from the remote, stop reading
        this.onRemoteCloseWrite()
        this._sendFlag(Message.Flag.FIN_ACK)
      }

      if (message.flag === Message.Flag.RESET) {
        // Stop reading and writing to the stream immediately
        this.onRemoteReset()
        this.receivedFinAck.resolve()
      }

      if (message.flag === Message.Flag.STOP_SENDING) {
        // The remote has stopped reading
        this.onRemoteCloseRead()
      }

      if (message.flag === Message.Flag.FIN_ACK) {
        this.receivedFinAck.resolve()
      }
    }

    // ignore data messages if we've closed the readable end already
    if (this.readStatus === 'readable' || this.readStatus === 'paused') {
      return message.message
    }
  }

  private _sendFlag (flag: Message.Flag): boolean {
    if (this.channel.readyState !== 'open') {
      // flags can be sent while we or the remote are closing the datachannel so
      // if the channel isn't open, don't try to send it but return false to let
      // the caller know and act if they need to
      this.log.trace('not sending flag %s because channel is "%s" and not "open"', flag.toString(), this.channel.readyState)
      return false
    }

    this.log.trace('sending flag %s', flag.toString())
    const messageBuf = Message.encode({ flag })
    const prefixedBuf = lengthPrefixed.encode.single(messageBuf)

    try {
      this._sendMessage(prefixedBuf)

      return true
    } catch (err: any) {
      this.log.error('could not send flag %s - %e', flag.toString(), err)
    }

    return false
  }

  sendPause (): void {
    // TODO: read backpressure?
  }

  sendResume (): void {
    // TODO: read backpressure?
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

  connection: RTCPeerConnection

  /**
   * The stream direction
   */
  direction: MessageStreamDirection

  /**
   * The logger to create a scope from
   */
  log: Logger

  /**
   * If true the underlying datachannel is being used to perform the noise
   * handshake during connection establishment
   */
  isHandshake?: boolean
}

export function createStream (options: WebRTCStreamOptions): WebRTCStream {
  const { channel, direction, isHandshake, connection } = options

  return new WebRTCStream({
    ...options,
    id: `${channel.id}`,
    log: options.log.newScope(`${isHandshake === true ? 'handshake' : direction}:${channel.id}`),
    protocol: '',
    connection
  })
}
