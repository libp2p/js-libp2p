import { WebRTCTransport } from './private-to-private/transport.js'
import { WebRTCDirectTransport, type WebRTCTransportDirectInit, type WebRTCDirectTransportComponents } from './private-to-public/transport.js'
import type { WebRTCTransportComponents, WebRTCTransportInit } from './private-to-private/transport.js'
import type { Transport } from '@libp2p/interface-transport'

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
