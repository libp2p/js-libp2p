import { encode as encoder } from '../../src/encode.ts'
import type { Message } from '../../src/message-types.ts'
import type { Uint8ArrayList } from 'uint8arraylist'

export function * encode (source: Iterable<Message>): Generator<Uint8ArrayList> {
  for (const buf of source) {
    yield encoder(buf)
  }
}
