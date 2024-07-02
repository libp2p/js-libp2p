import { createSocket } from 'node:dgram'
import { isIPv4 } from '@chainsafe/is-ip'
import { onUnhandledStunRequest } from 'node-datachannel'
import { pEvent } from 'p-event'
// @ts-expect-error no types
import stun from 'stun'
import { UFRAG_PREFIX } from '../constants.js'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (ufrag: string, pwd: string, remoteHost: string, remotePort: number, remoteFamily: number): void
}

async function dgramListener (host: string, port: number, ipVersion: 4 | 6, log: Logger, cb: Callback): Promise<StunServer> {
  const socket = createSocket({
    type: `udp${ipVersion}`,
    reuseAddr: true
  })

  try {
    socket.bind(port, host)
    await pEvent(socket, 'listening')
  } catch (err) {
    socket.close()
    throw err
  }

  socket.on('message', (msg, rinfo) => {
    // TODO: this needs to be rate limited keyed by the remote host to
    // prevent a DOS attack
    try {
      log('incoming STUN packet from %o', rinfo)
      const stunMessage = stun.decode(msg)
      const usernameAttribute = stunMessage.getAttribute(stun.constants.STUN_ATTR_USERNAME)
      const username: string | undefined = usernameAttribute?.value?.toString()

      if (username == null || !username.startsWith(UFRAG_PREFIX)) {
        log.trace('ufrag missing from incoming STUN message from %s:%s', rinfo.address, rinfo.port)
        return
      }

      const [ufrag, pwd] = username.split(':')

      cb(ufrag, pwd, rinfo.address, rinfo.port, rinfo.family === 'IPv4' ? 4 : 6)
    } catch (err) {
      log.error('could not process incoming STUN data from %o', rinfo, err)
    }
  })

  return {
    close: async () => {
      const p = pEvent(socket, 'close')
      socket.close()
      await p
    },
    address: () => {
      return socket.address()
    }
  }
}

let listening = false

async function libjuiceListener (host: string, port: number, ipVersion: 4 | 6, log: Logger, cb: Callback): Promise<StunServer> {
  if (listening) {
    throw new Error('There can only be one WebRTC-Direct listener per-process due to the limitations of libjuice. Please pass `useLibjuice=false` to override this, but this may break NAT traversal.')
  }

  onUnhandledStunRequest(host, port, (request) => {
    if (request.ufrag == null || request.pwd == null) {
      return
    }

    cb(request.ufrag, request.pwd, request.address, request.port, request.family)
  })

  return {
    close: async () => {
      onUnhandledStunRequest(host, port)
      listening = false
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

export interface STUNListenerOptions {
  useLibjuice?: boolean
}

export async function stunListener (host: string, port: number, ipVersion: 4 | 6, log: Logger, cb: Callback, opts: STUNListenerOptions = {}): Promise<StunServer> {
  if (opts.useLibjuice === false) {
    return dgramListener(host, port, ipVersion, log, cb)
  }

  return libjuiceListener(host, port, ipVersion, log, cb)
}
