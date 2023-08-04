import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type node from 'node-datachannel'

export class DataChannel extends EventTarget implements RTCDataChannel {
  binaryType: BinaryType

  readonly maxPacketLifeTime: number | null
  readonly maxRetransmits: number | null
  readonly negotiated: boolean
  readonly ordered: boolean

  onbufferedamountlow: ((this: RTCDataChannel, ev: Event) => any) | null
  onclose: ((this: RTCDataChannel, ev: Event) => any) | null
  onclosing: ((this: RTCDataChannel, ev: Event) => any) | null
  onerror: ((this: RTCDataChannel, ev: Event) => any) | null
  onmessage: ((this: RTCDataChannel, ev: MessageEvent) => any) | null
  onopen: ((this: RTCDataChannel, ev: Event) => any) | null

  #dataChannel: node.DataChannel
  #bufferedAmountLowThreshold: number
  #readyState: RTCDataChannelState

  constructor (dataChannel: node.DataChannel, dataChannelDict: RTCDataChannelInit = {}) {
    super()

    this.#dataChannel = dataChannel
    this.#readyState = 'connecting'
    this.#bufferedAmountLowThreshold = 0

    this.binaryType = 'arraybuffer'

    this.#dataChannel.onOpen(() => {
      this.#readyState = 'open'
      this.dispatchEvent(new Event('open'))
    })
    this.#dataChannel.onClosed(() => {
      this.#readyState = 'closed'
      this.dispatchEvent(new Event('close'))
    })
    this.#dataChannel.onError((msg) => {
      this.#readyState = 'closed'
      this.dispatchEvent(new RTCErrorEvent('error', {
        error: new RTCError({
          errorDetail: 'data-channel-failure'
        }, msg)
      }))
    })
    this.#dataChannel.onBufferedAmountLow(() => {
      this.dispatchEvent(new Event('bufferedamountlow'))
    })
    this.#dataChannel.onMessage((data: string | Uint8Array) => {
      if (typeof data === 'string') {
        data = uint8ArrayFromString(data)
      }

      this.dispatchEvent(new MessageEvent('message', { data }))
    })

    // forward events to properties
    this.addEventListener('message', event => {
      this.onmessage?.(event as MessageEvent<ArrayBuffer>)
    })
    this.addEventListener('bufferedamountlow', event => {
      this.onbufferedamountlow?.(event)
    })
    this.addEventListener('error', event => {
      this.onerror?.(event)
    })
    this.addEventListener('close', event => {
      this.onclose?.(event)
    })
    this.addEventListener('closing', event => {
      this.onclosing?.(event)
    })
    this.addEventListener('open', event => {
      this.onopen?.(event)
    })

    this.onbufferedamountlow = null
    this.onclose = null
    this.onclosing = null
    this.onerror = null
    this.onmessage = null
    this.onopen = null

    this.maxPacketLifeTime = dataChannelDict.maxPacketLifeTime ?? null
    this.maxRetransmits = dataChannelDict.maxRetransmits ?? null
    this.negotiated = dataChannelDict.negotiated ?? false
    this.ordered = dataChannelDict.ordered ?? true
  }

  get id (): number {
    return this.#dataChannel.getId()
  }

  get label (): string {
    return this.#dataChannel.getLabel()
  }

  get protocol (): string {
    return this.#dataChannel.getProtocol()
  }

  get bufferedAmount (): number {
    return this.#dataChannel.bufferedAmount()
  }

  set bufferedAmountLowThreshold (threshold: number) {
    this.#bufferedAmountLowThreshold = threshold
    this.#dataChannel.setBufferedAmountLowThreshold(threshold)
  }

  get bufferedAmountLowThreshold (): number {
    return this.#bufferedAmountLowThreshold
  }

  get readyState (): RTCDataChannelState {
    return this.#readyState
  }

  close (): void {
    this.#readyState = 'closing'
    this.dispatchEvent(new Event('closing'))

    this.#dataChannel.close()
  }

  send (data: string): void
  send (data: Blob): void
  send (data: ArrayBuffer): void
  send (data: ArrayBufferView): void
  send (data: any): void {
    // TODO: sending Blobs
    if (typeof data === 'string') {
      this.#dataChannel.sendMessage(data)
    } else {
      this.#dataChannel.sendMessageBinary(data)
    }
  }
}
