import { CustomEvent } from '@libp2p/interface'
import { MESSAGE_TYPE_LOOKUP } from '../message/index.js'
import type { SendQueryEvent, PeerResponseEvent, DialPeerEvent, AddPeerEvent, ValueEvent, ProviderEvent, QueryErrorEvent, FinalPeerEvent, QueryOptions } from '../index.js'
import type { Message } from '../message/dht.js'
import type { Libp2pRecord } from '../record/index.js'
import type { PeerId, PeerInfo } from '@libp2p/interface'

export interface QueryEventFields {
  to: PeerId
  type: Message.MessageType
}

export function sendQueryEvent (fields: QueryEventFields, options: QueryOptions = {}): SendQueryEvent {
  const event: SendQueryEvent = {
    ...fields,
    name: 'SEND_QUERY',
    type: 0,
    messageName: fields.type,
    messageType: MESSAGE_TYPE_LOOKUP.indexOf(fields.type.toString())
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:send-query', { detail: event }))

  return event
}

export interface PeerResponseEventField {
  from: PeerId
  messageType: Message.MessageType
  closer?: PeerInfo[]
  providers?: PeerInfo[]
  record?: Libp2pRecord
}

export function peerResponseEvent (fields: PeerResponseEventField, options: QueryOptions = {}): PeerResponseEvent {
  const event: PeerResponseEvent = {
    ...fields,
    name: 'PEER_RESPONSE',
    type: 1,
    messageName: fields.messageType,
    closer: (fields.closer != null) ? fields.closer : [],
    providers: (fields.providers != null) ? fields.providers : []
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:peer-response', { detail: event }))

  return event
}

export interface FinalPeerEventFields {
  from: PeerId
  peer: PeerInfo
}

export function finalPeerEvent (fields: FinalPeerEventFields, options: QueryOptions = {}): FinalPeerEvent {
  const event: FinalPeerEvent = {
    ...fields,
    name: 'FINAL_PEER',
    type: 2
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:final-peer', { detail: event }))

  return event
}

export interface ErrorEventFields {
  from: PeerId
  error: Error
}

export function queryErrorEvent (fields: ErrorEventFields, options: QueryOptions = {}): QueryErrorEvent {
  const event: QueryErrorEvent = {
    ...fields,
    name: 'QUERY_ERROR',
    type: 3
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:query-error', { detail: event }))

  return event
}

export interface ProviderEventFields {
  from: PeerId
  providers: PeerInfo[]
}

export function providerEvent (fields: ProviderEventFields, options: QueryOptions = {}): ProviderEvent {
  const event: ProviderEvent = {
    ...fields,
    name: 'PROVIDER',
    type: 4
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:provider', { detail: event }))

  return event
}

export interface ValueEventFields {
  from: PeerId
  value: Uint8Array
}

export function valueEvent (fields: ValueEventFields, options: QueryOptions = {}): ValueEvent {
  const event: ValueEvent = {
    ...fields,
    name: 'VALUE',
    type: 5
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:value', { detail: event }))

  return event
}

export interface PeerEventFields {
  peer: PeerId
}

export function addPeerEvent (fields: PeerEventFields, options: QueryOptions = {}): AddPeerEvent {
  const event: AddPeerEvent = {
    ...fields,
    name: 'ADD_PEER',
    type: 6
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:add-peer', { detail: event }))

  return event
}

export interface DialPeerEventFields {
  peer: PeerId
}

export function dialPeerEvent (fields: DialPeerEventFields, options: QueryOptions = {}): DialPeerEvent {
  const event: DialPeerEvent = {
    ...fields,
    name: 'DIAL_PEER',
    type: 7
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:dial-peer', { detail: event }))

  return event
}
