import type { Uint8ArrayList } from 'uint8arraylist'

type INITIATOR_NAME = 'NEW_STREAM' | 'MESSAGE' | 'CLOSE' | 'RESET'
type RECEIVER_NAME = 'MESSAGE' | 'CLOSE' | 'RESET'
type NAME = 'NEW_STREAM' | 'MESSAGE_INITIATOR' | 'CLOSE_INITIATOR' | 'RESET_INITIATOR' | 'MESSAGE_RECEIVER' | 'CLOSE_RECEIVER' | 'RESET_RECEIVER'
type CODE = 0 | 1 | 2 | 3 | 4 | 5 | 6

export enum MessageTypes {
  NEW_STREAM = 0,
  MESSAGE_RECEIVER = 1,
  MESSAGE_INITIATOR = 2,
  CLOSE_RECEIVER = 3,
  CLOSE_INITIATOR = 4,
  RESET_RECEIVER = 5,
  RESET_INITIATOR = 6
}

export const MessageTypeNames: Record<CODE, NAME> = Object.freeze({
  0: 'NEW_STREAM',
  1: 'MESSAGE_RECEIVER',
  2: 'MESSAGE_INITIATOR',
  3: 'CLOSE_RECEIVER',
  4: 'CLOSE_INITIATOR',
  5: 'RESET_RECEIVER',
  6: 'RESET_INITIATOR'
})

export const InitiatorMessageTypes: Record<INITIATOR_NAME, CODE> = Object.freeze({
  NEW_STREAM: MessageTypes.NEW_STREAM,
  MESSAGE: MessageTypes.MESSAGE_INITIATOR,
  CLOSE: MessageTypes.CLOSE_INITIATOR,
  RESET: MessageTypes.RESET_INITIATOR
})

export const ReceiverMessageTypes: Record<RECEIVER_NAME, CODE> = Object.freeze({
  MESSAGE: MessageTypes.MESSAGE_RECEIVER,
  CLOSE: MessageTypes.CLOSE_RECEIVER,
  RESET: MessageTypes.RESET_RECEIVER
})

export interface NewStreamMessage {
  id: number
  type: MessageTypes.NEW_STREAM
  data: Uint8Array | Uint8ArrayList
}

export interface MessageReceiverMessage {
  id: number
  type: MessageTypes.MESSAGE_RECEIVER
  data: Uint8Array | Uint8ArrayList
}

export interface MessageInitiatorMessage {
  id: number
  type: MessageTypes.MESSAGE_INITIATOR
  data: Uint8Array | Uint8ArrayList
}

export interface CloseReceiverMessage {
  id: number
  type: MessageTypes.CLOSE_RECEIVER
}

export interface CloseInitiatorMessage {
  id: number
  type: MessageTypes.CLOSE_INITIATOR
}

export interface ResetReceiverMessage {
  id: number
  type: MessageTypes.RESET_RECEIVER
}

export interface ResetInitiatorMessage {
  id: number
  type: MessageTypes.RESET_INITIATOR
}

export type Message = NewStreamMessage | MessageReceiverMessage | MessageInitiatorMessage | CloseReceiverMessage | CloseInitiatorMessage | ResetReceiverMessage | ResetInitiatorMessage
