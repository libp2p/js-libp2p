import { WebRTCTransport } from './private-to-private/transport.js'
import { WebRTCDirectTransport, type WebRTCTransportDirectInit, type WebRTCDirectTransportComponents } from './private-to-public/transport.js'
import type { WebRTCTransportComponents, WebRTCTransportInit } from './private-to-private/transport.js'
import type { Transport } from '@libp2p/interface/transport'

export interface DataChannelOptions {
  /**
   * The maximum message size sendable over the channel in bytes (default 16KB)
   */
  maxMessageSize?: number

  /**
   * If the channel's `bufferedAmount` grows over this amount in bytes, wait
   * for it to drain before sending more data (default: 16MB)
   */
  maxBufferedAmount?: number

  /**
   * When `bufferedAmount` is above `maxBufferedAmount`, we pause sending until
   * the `bufferedAmountLow` event fires - this controls how long we wait for
   * that event in ms (default: 30s)
   */
  bufferedAmountLowEventTimeout?: number

  /**
   * When closing a stream, we wait for `bufferedAmount` to become 0 before
   * closing the underlying RTCDataChannel - this controls how long we wait
   * in ms (default: 30s)
   */
  drainTimeout?: number

  /**
   * When closing a stream we first send a FIN flag to the remote and wait
   * for a FIN_ACK reply before closing the underlying RTCDataChannel - this
   * controls how long we wait for the acknowledgement in ms (default: 5s)
   */
  closeTimeout?: number
}

/**
 * @param {WebRTCTransportDirectInit} init - WebRTC direct transport configuration
 * @param init.dataChannel - DataChannel configurations
 * @param {number} init.dataChannel.maxMessageSize - Max message size that can be sent through the DataChannel. Larger messages will be chunked into smaller messages below this size (default 16kb)
 * @param {number} init.dataChannel.maxBufferedAmount - Max buffered amount a DataChannel can have (default 16mb)
 * @param {number} init.dataChannel.bufferedAmountLowEventTimeout - If max buffered amount is reached, this is the max time that is waited before the buffer is cleared (default 30 seconds)
 * @returns
 */
function webRTCDirect (init?: WebRTCTransportDirectInit): (components: WebRTCDirectTransportComponents) => Transport {
  return (components: WebRTCDirectTransportComponents) => new WebRTCDirectTransport(components, init)
}

/**
 * @param {WebRTCTransportInit} init - WebRTC transport configuration
 * @param {RTCConfiguration} init.rtcConfiguration - RTCConfiguration
 * @param init.dataChannel - DataChannel configurations
 * @param {number} init.dataChannel.maxMessageSize - Max message size that can be sent through the DataChannel. Larger messages will be chunked into smaller messages below this size (default 16kb)
 * @param {number} init.dataChannel.maxBufferedAmount - Max buffered amount a DataChannel can have (default 16mb)
 * @param {number} init.dataChannel.bufferedAmountLowEventTimeout - If max buffered amount is reached, this is the max time that is waited before the buffer is cleared (default 30 seconds)
 * @returns
 */
function webRTC (init?: WebRTCTransportInit): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components, init)
}

export { webRTC, webRTCDirect }
