import { MESSAGE_TYPE_LOOKUP } from '../message/index.js'
import type { Message } from '../message/dht.js'
import type { SendingQueryEvent, PeerResponseEvent, DialingPeerEvent, AddingPeerEvent, ValueEvent, ProviderEvent, QueryErrorEvent, FinalPeerEvent } from '@libp2p/interfaces/dht'
import type { PeerInfo } from '@libp2p/interfaces/peer-info'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Libp2pRecord } from '@libp2p/record'

export interface QueryEventFields {
  to: PeerId
  type: Message.MessageType
}

export function sendingQueryEvent (fields: QueryEventFields): SendingQueryEvent {
  return {
    ...fields,
    name: 'SENDING_QUERY',
    type: 0,
    messageName: fields.type,
    messageType: MESSAGE_TYPE_LOOKUP.indexOf(fields.type.toString())
  }
}

export interface PeerResponseEventField {
  from: PeerId
  messageType: Message.MessageType
  closer?: PeerInfo[]
  providers?: PeerInfo[]
  record?: Libp2pRecord
}

export function peerResponseEvent (fields: PeerResponseEventField): PeerResponseEvent {
  return {
    ...fields,
    name: 'PEER_RESPONSE',
    type: 1,
    messageName: fields.messageType,
    closer: (fields.closer != null) ? fields.closer : [],
    providers: (fields.providers != null) ? fields.providers : []
  }
}

export interface FinalPeerEventFields {
  from: PeerId
  peer: PeerInfo
}

export function finalPeerEvent (fields: FinalPeerEventFields): FinalPeerEvent {
  return {
    ...fields,
    name: 'FINAL_PEER',
    type: 2
  }
}

export interface ErrorEventFields {
  from: PeerId
  error: Error
}

export function queryErrorEvent (fields: ErrorEventFields): QueryErrorEvent {
  return {
    ...fields,
    name: 'QUERY_ERROR',
    type: 3
  }
}

export interface ProviderEventFields {
  from: PeerId
  providers: PeerInfo[]
}

export function providerEvent (fields: ProviderEventFields): ProviderEvent {
  return {
    ...fields,
    name: 'PROVIDER',
    type: 4
  }
}

export interface ValueEventFields {
  from: PeerId
  value: Uint8Array
}

export function valueEvent (fields: ValueEventFields): ValueEvent {
  return {
    ...fields,
    name: 'VALUE',
    type: 5
  }
}

export interface PeerEventFields {
  peer: PeerId
}

export function addingPeerEvent (fields: PeerEventFields): AddingPeerEvent {
  return {
    ...fields,
    name: 'ADDING_PEER',
    type: 6
  }
}

export interface DialingPeerEventFields {
  peer: PeerId
}

export function dialingPeerEvent (fields: DialingPeerEventFields): DialingPeerEvent {
  return {
    ...fields,
    name: 'DIALING_PEER',
    type: 7
  }
}
