import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from 'node-datachannel'
import { decodeV2ClientPwd } from './sdp.ts'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (serverUfrag: string, clientUfrag: string, clientPwd: string | undefined, remoteHost: string, remotePort: number): void
}

export function parseStunUsernameUfrags (serverUfrag: string, clientUfrag: string): { serverUfrag: string, clientUfrag: string } | undefined {
  if (serverUfrag.length === 0 || clientUfrag.length === 0) {
    return undefined
  }

  return {
    serverUfrag,
    clientUfrag
  }
}

export async function stunListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  const listener = new IceUdpMuxListener(port, host)
  listener.onUnhandledStunRequest(request => {
    if (request.localUfrag == null || request.ufrag == null) {
      if (request.ufrag != null) {
        log.trace('incoming legacy STUN packet from %s:%d %s', request.host, request.port, request.ufrag)
        cb(request.ufrag, request.ufrag, undefined, request.host, request.port)
      }

      return
    }

    if (!request.localUfrag.startsWith('libp2p+webrtc+v2/')) {
      log.trace('incoming legacy STUN packet from %s:%d %s', request.host, request.port, request.ufrag)
      cb(request.ufrag, request.ufrag, undefined, request.host, request.port)
      return
    }

    const parsed = parseStunUsernameUfrags(request.localUfrag, request.ufrag)

    if (parsed == null) {
      log.trace('incoming STUN packet from %s:%d had invalid ufrags %s %s', request.host, request.port, request.localUfrag, request.ufrag)
      return
    }

    log.trace('incoming STUN packet from %s:%d %s:%s', request.host, request.port, request.localUfrag, request.ufrag)

    const clientPwd = decodeV2ClientPwd(parsed.serverUfrag)

    cb(parsed.serverUfrag, parsed.clientUfrag, clientPwd, request.host, request.port)
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
