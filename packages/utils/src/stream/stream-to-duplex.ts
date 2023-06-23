import type { ByteStream } from '@libp2p/interface/connection'
import type { Duplex, Source } from 'it-stream-types'

export function streamToDuplex (stream: ByteStream): Duplex<AsyncGenerator<Uint8Array, void, unknown>, Source<Uint8Array>, Promise<void>> {
  return {
    sink: async (source) => {
      const writer = stream.writable.getWriter()

      try {
        for await (const buf of source) {
          await writer.ready
          await writer.write(buf)
        }
      } finally {
        writer.releaseLock()
      }
    },
    source: (async function * () {
      const reader = stream.readable.getReader()

      try {
        while (true) {
          const next = await reader.read()

          if (next.done) {
            return
          }

          yield next.value
        }
      } finally {
        reader.releaseLock()
      }
    }())
  }
}
