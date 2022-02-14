import { Message, MessageTypes } from '../../src/message-types.js'

export function messageWithBytes (msg: Message) {
  if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    return {
      ...msg,
      data: msg.data.slice() // convert Uint8ArrayList to Buffer
    }
  }

  return msg
}
