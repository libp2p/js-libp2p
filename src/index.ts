import { WebRTCTransport } from './peer_transport/transport.js'
import { WebRTCDirectTransport, type WebRTCDirectTransportComponents } from './transport.js'
import type { WebRTCTransportComponents, WebRTCTransportInit } from './peer_transport/transport.js'
import type { Transport } from '@libp2p/interface-transport'

function webRTCDirect (): (components: WebRTCDirectTransportComponents) => Transport {
  return (components: WebRTCDirectTransportComponents) => new WebRTCDirectTransport(components)
}

function webRTC (init?: WebRTCTransportInit): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components, init ?? {})
}

export { webRTC, webRTCDirect }
