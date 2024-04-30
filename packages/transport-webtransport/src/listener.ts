import type { WebTransportCertificate } from './index.js'
import type { Connection, Upgrader, Listener, CreateListenerOptions, PeerId, ComponentLogger, Metrics } from '@libp2p/interface'

export interface WebTransportListenerComponents {
  peerId: PeerId
  logger: ComponentLogger
  metrics?: Metrics
}

export interface WebTransportListenerInit extends CreateListenerOptions {
  handler?(conn: Connection): void
  upgrader: Upgrader
  certificates?: WebTransportCertificate[]
  maxInboundStreams?: number
}

export default function createListener (components: WebTransportListenerComponents, options: WebTransportListenerInit): Listener {
  throw new Error('Only supported in browsers')
}
