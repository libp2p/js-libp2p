import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from './consts.js'
import { DefaultIdentifyService } from './identify.js'
import { Identify } from './pb/message.js'
import type { AbortOptions, IdentifyResult, Libp2pEvents } from '@libp2p/interface'
import type { EventEmitter } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Connection } from '@libp2p/interface/src/connection/index.js'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'

export interface IdentifyServiceInit {
  /**
   * The prefix to use for the protocol (default: 'ipfs')
   */
  protocolPrefix?: string

  /**
   * What details we should send as part of an identify message
   */
  agentVersion?: string

  /**
   * How long we should wait for a remote peer to send their identify response
   */
  timeout?: number

  /**
   * Identify responses larger than this in bytes will be rejected (default: 8192)
   */
  maxIdentifyMessageSize?: number

  maxInboundStreams?: number
  maxOutboundStreams?: number

  maxPushIncomingStreams?: number
  maxPushOutgoingStreams?: number
  maxObservedAddresses?: number

  /**
   * Whether to automatically dial identify on newly opened connections (default: true)
   */
  runOnConnectionOpen?: boolean

  /**
   * Whether to run on connections with data or duration limits (default: true)
   */
  runOnTransientConnection?: boolean
}

export interface IdentifyServiceComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  addressManager: AddressManager
  events: EventEmitter<Libp2pEvents>
}

/**
 * The protocols the IdentifyService supports
 */
export const multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}

export const Message = { Identify }

export interface IdentifyService {
  /**
   * due to the default limits on inbound/outbound streams for this protocol,
   * invoking this method when runOnConnectionOpen is true can lead to unpredictable results
   * as streams may be closed by the local or the remote node.
   * Please use with caution. If you find yourself needing to call this method to discover other peers that support your protocol,
   * you may be better off configuring a topology to be notified instead.
   */
  identify: (connection: Connection, options?: AbortOptions) => Promise<IdentifyResult>

  push: () => Promise<void>
}

export function identifyService (init: IdentifyServiceInit = {}): (components: IdentifyServiceComponents) => IdentifyService {
  return (components) => new DefaultIdentifyService(components, init)
}
