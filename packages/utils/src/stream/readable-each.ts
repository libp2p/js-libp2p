
export function readableEach <T> (readable: ReadableStream<T>, fn: (val: T) => void): ReadableStream<T> {
  const reader = readable.getReader()

  return new ReadableStream<T>({
    pull: async controller => {
      try {
        const res = await reader.read()

        if (res.done) {
          controller.close()
          return
        }

        fn(res.value)

        controller.enqueue(res.value)
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    }
  })
}
