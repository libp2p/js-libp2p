import { pushable } from 'it-pushable'

export function transformStreamEach <T> (fn: (chunk: T) => void | Promise<void>): ReadableWritablePair<T, T> {
  const queue = pushable<T>({
    objectMode: true
  })

  return {
    writable: new WritableStream<T>({
      write: async (chunk) => {
        await fn(chunk)
        queue.push(chunk)
      },
      close: async () => {
        queue.end()
      },
      abort: async (err: Error) => {
        queue.end(err)
      }
    }),

    readable: new ReadableStream<T>({
      pull: async controller => {
        const res = await queue.next()

        if (res.done === true) {
          controller.close()
          return
        }

        controller.enqueue(res.value)
      }
    })
  }
}
