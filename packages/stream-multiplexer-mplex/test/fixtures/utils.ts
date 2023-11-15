import { type Message, MessageTypes } from '../../src/message-types.js'

export type MessageWithBytes = {
  [k in keyof Message]: Message[k]
} & {
  data: Uint8Array
}

export function messageWithBytes (msg: Message): Message | MessageWithBytes {
  if (msg.type === MessageTypes.NEW_STREAM || msg.type === MessageTypes.MESSAGE_INITIATOR || msg.type === MessageTypes.MESSAGE_RECEIVER) {
    return {
      ...msg,
      data: msg.data.slice() // convert Uint8ArrayList to Uint8Array
    }
  }

  return msg
}

export function arrayToGenerator <T> (data: T[]): AsyncGenerator<T, void, unknown> {
  let done: Error | boolean = false
  let index = -1

  const generator: AsyncGenerator<T, void, unknown> = {
    [Symbol.asyncIterator]: () => {
      return generator
    },
    async next () {
      if (done instanceof Error) {
        throw done
      }

      index++

      if (index === data.length) {
        done = true
      }

      if (done) {
        return {
          done: true,
          value: undefined
        }
      }

      return {
        done: false,
        value: data[index]
      }
    },
    async return (): Promise<IteratorReturnResult<void>> {
      done = true

      return {
        done: true,
        value: undefined
      }
    },
    async throw (err: Error): Promise<IteratorReturnResult<void>> {
      done = err

      return {
        done: true,
        value: undefined
      }
    }
  }

  return generator
}
