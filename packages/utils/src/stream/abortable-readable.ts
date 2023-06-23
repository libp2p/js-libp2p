
export function abortableReadable <T> (readable: ReadableStream<T>, signal: AbortSignal): ReadableStream<T> {
  let controller: ReadableStreamController<T> | undefined
  const reader = readable.getReader()

  const listener: EventListener = () => {
    signal.removeEventListener('abort', listener)
    controller?.error(new Error('Aborted'))
  }

  signal.addEventListener('abort', listener)

  const stream = new ReadableStream({
    start: (c) => {
      controller = c
    },
    pull: async controller => {
      try {
        const res = await reader.read()

        if (res.done) {
          controller.close()
          signal.removeEventListener('abort', listener)
          return
        }

        controller.enqueue(res.value)
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock()
      }
    }
  })

  return stream
}
