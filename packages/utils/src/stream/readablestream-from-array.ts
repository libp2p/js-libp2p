
export function readableStreamFromArray <T> (arr: T[]): ReadableStream<T> {
  let index = 0

  return new ReadableStream({
    pull: controller => {
      if (index === arr.length) {
        controller.close()
        return
      }

      controller.enqueue(arr[index])
      index++
    }
  })
}
