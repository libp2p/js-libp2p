import { createSocket } from 'node:dgram'
import { once } from 'node:events'
import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from 'node-datachannel'
import { handleStunRequest } from '../../util.ts'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (ufrag: string, remoteHost: string, remotePort: number): void
}

export async function stunListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  let listener: IceUdpMuxListener

  for (let attempt = 1; ; attempt++) {
    // libjuice cannot allocate an ephemeral port itself. Probe UDP, not TCP.
    const candidate = port === 0 ? await getUDPPort(isIPv4(host)) : port

    try {
      listener = new IceUdpMuxListener(candidate, host)
      port = candidate
      break
    } catch (err) {
      // Another process can claim the port between releasing the probe and
      // binding the native listener. Only ephemeral bind failures can reselect.
      if (port !== 0 || attempt === 5 || !(err instanceof Error) || err.message !== 'Failed to register ICE UDP mux listener') {
        throw err
      }
    }
  }
  listener.onUnhandledStunRequest(request => {
    handleStunRequest(request, log, cb)
  })

  return {
    close: async () => {
      listener.stop()
    },
    address: () => {
      return {
        address: host,
        family: isIPv4(host) ? 'IPv4' : 'IPv6',
        port
      }
    }
  }
}

async function getUDPPort (ipv4: boolean): Promise<number> {
  const socket = createSocket(ipv4 ? 'udp4' : 'udp6')

  try {
    const listening = once(socket, 'listening')
    socket.bind(0)
    await listening
    return socket.address().port
  } finally {
    await socket[Symbol.asyncDispose]()
  }
}
