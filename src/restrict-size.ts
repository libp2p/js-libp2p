import { Message, MessageTypes } from './message-types.js'
import type { Source, Transform } from 'it-stream-types'

export const MAX_MSG_SIZE = 1 << 20 // 1MB

/**
 * Creates an iterable transform that restricts message sizes to
 * the given maximum size.
 */
export function restrictSize (max?: number): Transform<Message | Message[], Message> {
  const maxSize = max ?? MAX_MSG_SIZE

  const checkSize = (msg: Message) => {
    if (msg.type !== MessageTypes.NEW_STREAM && msg.type !== MessageTypes.MESSAGE_INITIATOR && msg.type !== MessageTypes.MESSAGE_RECEIVER) {
      return
    }

    if (msg.data.byteLength > maxSize) {
      throw Object.assign(new Error('message size too large!'), { code: 'ERR_MSG_TOO_BIG' })
    }
  }

  return (source: Source<Message | Message[]>) => {
    return (async function * restrictSize () {
      for await (const msg of source) {
        if (Array.isArray(msg)) {
          msg.forEach(checkSize)
          yield * msg
        } else {
          checkSize(msg)
          yield msg
        }
      }
    })()
  }
}
