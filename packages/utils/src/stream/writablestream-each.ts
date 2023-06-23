
export function writeableStreamEach <T> (fn: (chunk: T) => void | Promise<void>): WritableStream<T> {
  return new WritableStream<T>({
    write: async (chunk) => {
      await fn(chunk)
    }
  })
}
