import { Message, MessageTypes } from '../../src/message-types.js'

export type MessageWithBytes = {
  [k in keyof Message]: Message[k]
} & {
  data: Uint8Array
}

export function messageWithBytes (msg: Message): Message | MessageWithBytes {
  if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    return {
      ...msg,
      data: msg.data.slice() // convert Uint8ArrayList to Uint8Array
    }
  }

  return msg
}
