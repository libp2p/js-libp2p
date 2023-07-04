import {
  AGENT_VERSION,
  MAX_IDENTIFY_MESSAGE_SIZE,
  MAX_INBOUND_STREAMS,
  MAX_OUTBOUND_STREAMS,
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  PROTOCOL_PREFIX,
  TIMEOUT
} from './consts.js'
import { DefaultIdentifyService } from './identify.js'
import { Identify } from './pb/message.js'
import type { Libp2pEvents } from '@libp2p/interface'
import type { EventEmitter } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import { number, object, string } from 'yup'

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

export function identifyService (init: IdentifyServiceInit = {}): (components: IdentifyServiceComponents) => DefaultIdentifyService {
  object({
    protocolPrefix: string().default(PROTOCOL_PREFIX),
    agentVersion: string().default(AGENT_VERSION),
    timeout: number().integer().default(TIMEOUT),
    maxIdentifyMessageSize: number().integer().min(0).default(MAX_IDENTIFY_MESSAGE_SIZE),
    maxInboundStreams: number().integer().min(0).default(MAX_INBOUND_STREAMS),
    maxOutboundStreams: number().integer().min(0).default(MAX_OUTBOUND_STREAMS),
  }).validateSync(init)

  return (components) => new DefaultIdentifyService(components, init)
}
