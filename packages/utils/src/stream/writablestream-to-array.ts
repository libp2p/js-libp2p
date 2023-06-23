
export function writeableStreamToArray <T> (arr: T[]): WritableStream<T> {
  return new WritableStream({
    write: (chunk) => {
      arr.push(chunk)
    }
  })
}
