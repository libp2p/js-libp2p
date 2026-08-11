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
  const listener = new IceUdpMuxListener(port, host)
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
