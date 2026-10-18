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

export async function stunListener (host: string, port: number, log: Logger, cb: StunRequestCallback): Promise<StunServer> {
  const listener = new IceUdpMuxListener(port, host)
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
