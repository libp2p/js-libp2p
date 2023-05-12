import { WebRTCTransport } from './private-to-private/transport.js'
import { WebRTCDirectTransport, type WebRTCDirectTransportComponents } from './private-to-public/transport.js'
import type { WebRTCTransportComponents, WebRTCTransportInit } from './private-to-private/transport.js'
import type { Transport } from '@libp2p/interface-transport'

function webRTCDirect (): (components: WebRTCDirectTransportComponents) => Transport {
  return (components: WebRTCDirectTransportComponents) => new WebRTCDirectTransport(components)
}

function webRTC (init?: WebRTCTransportInit): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components, init ?? {})
}

export { webRTC, webRTCDirect }
