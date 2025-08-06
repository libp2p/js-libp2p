import stream from 'node:stream'
import { Uint8ArrayList } from 'uint8arraylist'

export interface SocketWriter {
  /**
   * Write any available data into the socket, if the socket's internal write
   * buffer has available capacity
   */
  pull (): boolean

  /**
   * Write data into the socket, returns false if the socket's internal write
   * buffer is at capacity
   */
  write (data: Uint8Array | Uint8Array[] | Uint8ArrayList): boolean
}

export function socketWriter (socket: stream.Duplex): SocketWriter {
  const queue = new Uint8ArrayList()

  return {
    pull (): boolean {
      if (socket.writableNeedDrain) {
        return false
      }

      for (const buf of queue) {
        queue.consume(buf.byteLength)

        if (!socket.write(buf)) {
          // continue writing after drain event. this is a synchronous operation
          // so it will not interleave with the `this.writeToSocket()` invocation
          // in this.sendData so all data will be sent in-order
          if (queue.byteLength > 0) {
            socket.once('drain', () => {
              this.pull()
            })
          }

          return false
        }
      }

      return true
    },

    write (data: Uint8Array | Uint8Array[] | Uint8ArrayList): boolean {
      if (Array.isArray(data)) {
        queue.appendAll(data)
      } else {
        queue.append(data)
      }

      if (socket.writableNeedDrain) {
        return false
      }

      return this.pull()
    }
  }
}
