import os from 'node:os'
import { isIPv6 } from '@chainsafe/is-ip'
import * as lengthPrefixed from 'it-length-prefixed'
import { isNode, isElectronMain } from 'wherearewe'
import { Message } from '../src/private-to-public/pb/message.js'

/**
 * simulates receiving a FIN_ACK on the passed datachannel
 */
export function receiveFinAck (channel: RTCDataChannel): void {
  const msgBuf = Message.encode({ flag: Message.Flag.FIN_ACK })
  const data = lengthPrefixed.encode.single(msgBuf).subarray()
  channel.onmessage?.(new MessageEvent<ArrayBuffer>('message', { data }))
}

let mockDataChannelId = 0

export const mockDataChannel = (opts: { send(bytes: Uint8Array): void, bufferedAmount?: number }): RTCDataChannel => {
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

/**
 * If we don't have any IPv6 network interfaces, the network we are on probably
 * doesn't support IPv6
 */
export function supportsIpV6 (): boolean {
  if (!isNode && !isElectronMain) {
    return false
  }

  return Object.entries(os.networkInterfaces())
    .flatMap(([_, addresses]) => addresses)
    .map(address => address?.address)
    .filter(address => {
      return address != null && isIPv6(address)
    })
    .length > 0
}
