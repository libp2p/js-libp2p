import { pushable } from 'it-pushable'
import type { Bytes } from '@libp2p/interface'

export function bytesTransform (): ReadableWritablePair<Uint8Array, Bytes> {
  const queue = pushable()

  return {
    writable: new WritableStream<Bytes>({
      write: (chunk, controller) => {
        try {
          if (chunk instanceof Uint8Array) {
            queue.push(chunk)
          } else {
            for (const buf of chunk) {
              queue.push(buf)
            }
          }
        } catch (err) {
          controller.error(err)
        }
      },
      abort: (err: any) => {
        queue.end(err)
      },
      close: () => {
        queue.end()
      }
    }),

    readable: new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        try {
          const next = await queue.next()

          if (next.done === true) {
            controller.close()
            return
          }

          controller.enqueue(next.value)
        } catch (err) {
          controller.error(err)
        }
      }
    })
  }
}
