'use strict'

const MessageTypes = Object.freeze({
  NEW_STREAM: 0,
  MESSAGE_RECEIVER: 1,
  MESSAGE_INITIATOR: 2,
  CLOSE_RECEIVER: 3,
  CLOSE_INITIATOR: 4,
  RESET_RECEIVER: 5,
  RESET_INITIATOR: 6
})

exports.MessageTypes = MessageTypes

exports.InitiatorMessageTypes = Object.freeze({
  NEW_STREAM: MessageTypes.NEW_STREAM,
  MESSAGE: MessageTypes.MESSAGE_INITIATOR,
  CLOSE: MessageTypes.CLOSE_INITIATOR,
  RESET: MessageTypes.RESET_INITIATOR
})

exports.ReceiverMessageTypes = Object.freeze({
  MESSAGE: MessageTypes.MESSAGE_RECEIVER,
  CLOSE: MessageTypes.CLOSE_RECEIVER,
  RESET: MessageTypes.RESET_RECEIVER
})

exports.MessageTypeNames = Object.freeze(
  Object.entries(MessageTypes).reduce((obj, e) => {
    obj[e[1]] = e[0]
    return obj
  }, {})
)
