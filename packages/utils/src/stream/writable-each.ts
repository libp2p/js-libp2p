
export function writableEach <T> (writable: WritableStream<T>, fn: (val: T) => void): WritableStream<T> {
  const writer = writable.getWriter()

  return new WritableStream<T>({
    write: async (chunk, controller) => {
      try {
        fn(chunk)

        await writer.ready
        await writer.write(chunk)
      } catch (err) {
        controller.error(err)
      } finally {
        writer.releaseLock()
      }
    }
  })
}
