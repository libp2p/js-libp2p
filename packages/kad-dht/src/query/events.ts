import type { MessageType, SendQueryEvent, PeerResponseEvent, AddPeerEvent, ValueEvent, ProviderEvent, QueryErrorEvent, FinalPeerEvent } from '../index.js'
import type { PeerId, PeerInfo } from '@libp2p/interface'
import type { Libp2pRecord } from '@libp2p/record'
import type { ProgressOptions } from 'progress-events'

export interface QueryEventFields {
  to: PeerId
  type: MessageType
  path: number
}

export function sendQueryEvent (fields: QueryEventFields, options: ProgressOptions = {}): SendQueryEvent {
  const event: SendQueryEvent = {
    ...fields,
    name: 'SEND_QUERY',
    type: 0,
    messageName: fields.type,
    messageType: fields.type
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:send-query', { detail: event }))

  return event
}

export interface PeerResponseEventFields {
  from: PeerId
  messageType: MessageType
  path: number
  closer?: PeerInfo[]
  providers?: PeerInfo[]
  record?: Libp2pRecord
}

export function peerResponseEvent (fields: PeerResponseEventFields, options: ProgressOptions = {}): PeerResponseEvent {
  const event: PeerResponseEvent = {
    ...fields,
    name: 'PEER_RESPONSE',
    type: 1,
    messageName: fields.messageType,
    closer: fields.closer ?? [],
    providers: fields.providers ?? []
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:peer-response', { detail: event }))

  return event
}

export interface FinalPeerEventFields {
  from: PeerId
  peer: PeerInfo
  path: number
}

export function finalPeerEvent (fields: FinalPeerEventFields, options: ProgressOptions = {}): FinalPeerEvent {
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
  path?: number
}

export function queryErrorEvent (fields: ErrorEventFields, options: ProgressOptions = {}): QueryErrorEvent {
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

export function providerEvent (fields: ProviderEventFields, options: ProgressOptions = {}): ProviderEvent {
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

export function valueEvent (fields: ValueEventFields, options: ProgressOptions = {}): ValueEvent {
  const event: ValueEvent = {
    ...fields,
    name: 'VALUE',
    type: 5
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:value', { detail: event }))

  return event
}

export interface AddPeerEventFields {
  peer: PeerId
  path: number
}

export function addPeerEvent (fields: AddPeerEventFields, options: ProgressOptions = {}): AddPeerEvent {
  const event: AddPeerEvent = {
    ...fields,
    name: 'ADD_PEER',
    type: 6
  }

  options.onProgress?.(new CustomEvent('kad-dht:query:add-peer', { detail: event }))

  return event
}
