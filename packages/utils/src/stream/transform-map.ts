import { pushable } from 'it-pushable'

export function transformMap <A, B = A> (fn: (chunk: A) => B | Promise<B>): ReadableWritablePair<B, A> {
  const queue = pushable<B>({
    objectMode: true
  })

  return {
    writable: new WritableStream<A>({
      write: async (chunk) => {
        const mapped = await fn(chunk)
        queue.push(mapped)
      },
      close: async () => {
        queue.end()
      },
      abort: async (err: Error) => {
        queue.end(err)
      }
    }),

    readable: new ReadableStream<B>({
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
