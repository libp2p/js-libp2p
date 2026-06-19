import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from 'node-datachannel'
import { UFRAG_PREFIX_V1, UFRAG_PREFIX_V2 } from '../../constants.js'
import { decodeV2ClientPwd } from './sdp.ts'
import { parseStunUsernameUfrags } from './stun.ts'
import type { Logger } from '@libp2p/interface'
import type { IceUdpMuxRequest } from 'node-datachannel'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (serverUfrag: string, clientUfrag: string, clientPwd: string | undefined, remoteHost: string, remotePort: number): void
}

export async function stunListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  const listener = new IceUdpMuxListener(port, host)
  listener.onUnhandledStunRequest((request: IceUdpMuxRequest) => {
    if (request.ufrag == null) {
      return
    }

    // The STUN USERNAME is "server_ufrag:client_ufrag" (RFC 8445 section 7.2.2).
    // When the mux cannot split it (no colon) localUfrag is absent and the single
    // ufrag is the shared v1 value used as both the server and client ufrag.
    const serverUfrag = request.localUfrag ?? request.ufrag
    const clientUfrag = request.ufrag

    const parsed = parseStunUsernameUfrags(serverUfrag, clientUfrag)
    if (parsed == null) {
      log.trace('incoming STUN packet from %s:%d had invalid ufrags %s %s', request.host, request.port, serverUfrag, clientUfrag)
      return
    }

    // Select the version explicitly from the server ufrag prefix. An unrecognized
    // version is rejected, never assumed to be v1. See https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md.
    if (parsed.serverUfrag.startsWith(UFRAG_PREFIX_V2)) {
      const clientPwd = decodeV2ClientPwd(parsed.serverUfrag)
      if (clientPwd == null) {
        log.trace('incoming v2 STUN packet from %s:%d had an invalid client password %s', request.host, request.port, parsed.serverUfrag)
        return
      }
      log.trace('incoming v2 STUN packet from %s:%d %s:%s', request.host, request.port, parsed.serverUfrag, parsed.clientUfrag)
      cb(parsed.serverUfrag, parsed.clientUfrag, clientPwd, request.host, request.port)
      return
    }

    if (parsed.serverUfrag.startsWith(UFRAG_PREFIX_V1)) {
      log.trace('incoming v1 STUN packet from %s:%d %s', request.host, request.port, parsed.serverUfrag)
      cb(parsed.serverUfrag, parsed.clientUfrag, undefined, request.host, request.port)
      return
    }

    log.trace('incoming STUN packet from %s:%d has an unsupported version prefix %s', request.host, request.port, parsed.serverUfrag)
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
