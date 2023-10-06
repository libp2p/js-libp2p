import { expect } from 'aegir/chai'
import * as lengthPrefixed from 'it-length-prefixed'
import { Message } from '../src/pb/message.js'

export const expectError = (error: unknown, message: string): void => {
  if (error instanceof Error) {
    expect(error.message).to.equal(message)
  } else {
    expect('Did not throw error:').to.equal(message)
  }
}

/**
 * simulates receiving a FIN_ACK on the passed datachannel
 */
export function receiveFinAck (channel: RTCDataChannel): void {
  const msgbuf = Message.encode({ flag: Message.Flag.FIN_ACK })
  const data = lengthPrefixed.encode.single(msgbuf).subarray()
  channel.onmessage?.(new MessageEvent<ArrayBuffer>('message', { data }))
}

let mockDataChannelId = 0

export const mockDataChannel = (opts: { send: (bytes: Uint8Array) => void, bufferedAmount?: number }): RTCDataChannel => {
  // @ts-expect-error incomplete implementation
  const channel: RTCDataChannel = {
    readyState: 'open',
    close: () => { },
    addEventListener: (_type: string, _listener: (_: any) => void) => { },
    removeEventListener: (_type: string, _listener: (_: any) => void) => { },
    id: mockDataChannelId++,
    ...opts
  }

  return channel
}
