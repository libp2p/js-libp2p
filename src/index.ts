import { Transport } from '@libp2p/interface-transport'
import { WebRTCTransport, WebRTCTransportComponents } from './transport'

export function webRTC (): (components: WebRTCTransportComponents) => Transport {
  return (components: WebRTCTransportComponents) => new WebRTCTransport(components)
}
