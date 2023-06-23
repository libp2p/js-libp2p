import { pushable } from 'it-pushable'
import { readableStreamFromGenerator } from './readablestream-from-generator.js'
import type { ByteStream } from '@libp2p/interface/connection'
import type { Duplex, Sink, Source } from 'it-stream-types'

export function duplexToStream (duplex: Duplex<AsyncGenerator<Uint8Array, void, Promise<void>>, Source<Uint8Array>, Promise<void>>): ByteStream {
  return {
    readable: readableStreamFromGenerator(duplex.source),
    writable: writableStreamFromSink(duplex.sink)
  }
}

function writableStreamFromSink (sink: Sink<AsyncGenerator<Uint8Array>, Promise<void>>): WritableStream<Uint8Array> {
  const p = pushable<Uint8Array>()
  let controller: WritableStreamDefaultController | undefined

  void sink(p)
    .catch(err => {
      controller?.error(err)
    })

  return new WritableStream({
    start: (c) => {
      controller = c
    },
    write: (chunk) => {
      p.push(chunk)
    },
    close: () => {
      p.end()
    },
    abort: (err) => {
      p.end(err)
    }
  })
}
