import delay from 'delay'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { readableStreamFromGenerator } from './readablestream-from-generator.js'

function randomBuffer (): Uint8Array {
  return uint8ArrayFromString(Math.random().toString())
}

async function * infiniteRandom (): AsyncGenerator<Uint8Array, void, unknown> {
  while (true) {
    yield randomBuffer()
    await delay(50)
  }
}

export function infiniteRandomReadableStream (): ReadableStream<Uint8Array> {
  return readableStreamFromGenerator(infiniteRandom())
}
