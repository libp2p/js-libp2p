/* eslint-env mocha */

import type { Message } from '../../src/message-types.js'
import { Decoder, MAX_MSG_QUEUE_SIZE, MAX_MSG_SIZE } from '../../src/decode.js'
import type { Source } from 'it-stream-types'

export function decode (maxMessageSize: number = MAX_MSG_SIZE, maxUnprocessedMessageQueueSize: number = MAX_MSG_QUEUE_SIZE) {
  return async function * decodeMessages (source: Source<Uint8Array>): Source<Message> {
    const decoder = new Decoder(maxMessageSize, maxUnprocessedMessageQueueSize)

    for await (const chunk of source) {
      const msgs = decoder.write(chunk)

      if (msgs.length > 0) {
        yield * msgs
      }
    }
  }
}
