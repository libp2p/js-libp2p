import { Decoder, MAX_MSG_QUEUE_SIZE, MAX_MSG_SIZE } from '../../src/decode.js'
import type { Message } from '../../src/message-types.js'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export function decode (maxMessageSize: number = MAX_MSG_SIZE, maxUnprocessedMessageQueueSize: number = MAX_MSG_QUEUE_SIZE) {
  return async function * decodeMessages (source: Source<Uint8Array | Uint8ArrayList>): Source<Message> {
    const decoder = new Decoder(maxMessageSize, maxUnprocessedMessageQueueSize)

    for await (const chunk of source) {
      const msgs = decoder.write(chunk)

      if (msgs.length > 0) {
        yield * msgs
      }
    }
  }
}
