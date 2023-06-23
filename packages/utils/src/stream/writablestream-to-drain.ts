
export function writeableStreamToDrain (): WritableStream<unknown> {
  return new WritableStream({
    write: () => {

    }
  })
}
