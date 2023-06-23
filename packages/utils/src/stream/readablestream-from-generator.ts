
export function readableStreamFromGenerator <T> (get: Generator<T, any, unknown> | AsyncGenerator<T, any, unknown>): ReadableStream<T> {
  return new ReadableStream<T>({
    pull: async controller => {
      const res = await get.next()

      if (res.done === true) {
        controller.close()
        return
      }

      controller.enqueue(res.value)
    }
  })
}
