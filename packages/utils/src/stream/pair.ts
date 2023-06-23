import defer from 'p-defer'
import type { Stream } from '@libp2p/interface/connection'
import type { Uint8ArrayList } from 'uint8arraylist'

export function pair (): Stream {
  let needChunk = defer<undefined>()
  let nextBuf = defer<Uint8Array | undefined>()

  const readable = new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      needChunk.resolve()
      needChunk = defer()

      const buf = await nextBuf.promise

      if (buf == null) {
        controller.close()
        return
      }

      try {
        controller.enqueue(buf)
      } catch (err) {
        controller.error(err)
      }
    },
    cancel: () => {
      needChunk.resolve()
    }
  })

  const writable = new WritableStream<Uint8Array | Uint8ArrayList>({
    write: async (chunk) => {
      if (chunk instanceof Uint8Array) {
        nextBuf.resolve(chunk)
        nextBuf = defer()

        return
      }

      for (const buf of chunk) {
        nextBuf.resolve(buf)
        nextBuf = defer()

        await needChunk.promise
      }
    },
    close: () => {
      nextBuf.resolve()
    }
  })

  return {
    readable,
    writable,
    protocol: '/foo/1.0.0',
    close: async () => Promise.all([
      readable.cancel(),
      writable.close()
    ]).then(),
    abort: () => {},
    id: `stream-${Math.random()}`,
    direction: 'inbound',
    timeline: {
      open: Date.now()
    },
    metadata: {}
  }
}
