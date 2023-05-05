import { Identify } from './pb/message.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from './consts.js'
import type { Registrar } from '@libp2p/interface-registrar'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import { DefaultIdentifyService } from './identify.js'

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

export function identifyService (init: IdentifyServiceInit = {}): (components: IdentifyServiceComponents) => {} {
  return (components) => new DefaultIdentifyService(components, init)
}
