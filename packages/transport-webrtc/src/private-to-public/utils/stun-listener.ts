import { createSocket } from 'node:dgram'
import { once } from 'node:events'
import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from 'node-datachannel'
import { handleStunRequest } from './stun.ts'
import type { StunRequestCallback } from './stun.ts'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

/**
 * How many ephemeral ports to try before giving up
 */
export const MAX_EPHEMERAL_BIND_ATTEMPTS = 5

export async function stunListener (host: string, port: number, log: Logger, cb: StunRequestCallback): Promise<StunServer> {
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
      if (port !== 0 || attempt === MAX_EPHEMERAL_BIND_ATTEMPTS || !(err instanceof Error) || err.message !== 'Failed to register ICE UDP mux listener') {
        throw err
      }
    }
  }
  listener.onUnhandledStunRequest(request => {
    // this runs inside a native callback where a throw would crash the process
    try {
      handleStunRequest(request, log, cb)
    } catch (err) {
      log.error('error handling STUN request from %s:%d - %e', request.host, request.port, err)
    }
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
