import { createSocket } from 'node:dgram'
import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from '@ipshipyard/node-datachannel'
import { pEvent } from 'p-event'
import { UFRAG_PREFIX } from '../../constants.js'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (ufrag: string, remoteHost: string, remotePort: number): void
}

export interface STUNListenerOptions {
  useLibjuice?: boolean
}

export async function stunListener (host: string, port: number, ipVersion: 4 | 6, log: Logger, cb: Callback, opts: STUNListenerOptions = {}): Promise<StunServer> {
  // Always use libjuice's implementation since we removed the stun package
  return libjuiceListener(host, port, log, cb)
}

async function libjuiceListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  const listener = new IceUdpMuxListener(port, host)
  listener.onUnhandledStunRequest(request => {
    if (request.ufrag == null || !request.ufrag.startsWith(UFRAG_PREFIX)) {
      return
    }

    log.trace('incoming STUN packet from %s:%d %s', request.host, request.port, request.ufrag)
    cb(request.ufrag, request.host, request.port)
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
