import { createSocket } from 'node:dgram'
import { isIPv4 } from '@chainsafe/is-ip'
import { IceUdpMuxListener } from '@ipshipyard/node-datachannel'
import { pEvent } from 'p-event'
import { UFRAG_PREFIX } from '../../constants.js'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

// STUN Message Type
const BINDING_REQUEST = 0x0001

// STUN Attribute Type
const USERNAME = 0x0006

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (ufrag: string, remoteHost: string, remotePort: number): void
}

function isStunBindingRequest(msg: Uint8Array): boolean {
  // Check if message is at least 20 bytes (STUN header size)
  if (msg.length < 20) {
    return false
  }

  // First two bits must be 0 to be a STUN message
  if ((msg[0] & 0xc0) !== 0) {
    return false
  }

  // Check message type (first 16 bits) is BINDING_REQUEST
  const messageType = (msg[0] << 8) | msg[1]
  if (messageType !== BINDING_REQUEST) {
    return false
  }

  // Check magic cookie (bytes 4-7)
  if (msg[4] !== 0x21 || msg[5] !== 0x12 || msg[6] !== 0xa4 || msg[7] !== 0x42) {
    return false
  }

  return true
}

function parseUsername(msg: Uint8Array): string | undefined {
  let offset = 20 // Start after header

  while (offset + 4 <= msg.length) {
    const type = (msg[offset] << 8) | msg[offset + 1]
    const length = (msg[offset + 2] << 8) | msg[offset + 3]
    offset += 4

    if (type === USERNAME) {
      if (offset + length > msg.length) {
        return undefined
      }
      return new TextDecoder().decode(msg.slice(offset, offset + length))
    }

    // Move to next attribute (padding to 4 bytes)
    offset += Math.ceil(length / 4) * 4
  }

  return undefined
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

  socket.on('message', (msg: Buffer, rinfo) => {
    try {
      log.trace('incoming STUN packet from %o', rinfo)
      
      if (!isStunBindingRequest(msg)) {
        log.trace('incoming packet is not a STUN binding request from %s:%s', rinfo.address, rinfo.port)
        return
      }

      const username = parseUsername(msg)

      if (username?.startsWith(UFRAG_PREFIX) !== true) {
        log.trace('ufrag missing from incoming STUN message from %s:%s', rinfo.address, rinfo.port)
        return
      }

      const [ufrag] = username.split(':')

      cb(ufrag, rinfo.address, rinfo.port)
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

async function libjuiceListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  const listener = new IceUdpMuxListener(port, host)
  listener.onUnhandledStunRequest(request => {
    if (request.ufrag == null) {
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

export interface STUNListenerOptions {
  useLibjuice?: boolean
}

export async function stunListener (host: string, port: number, ipVersion: 4 | 6, log: Logger, cb: Callback, opts: STUNListenerOptions = {}): Promise<StunServer> {
  if (opts.useLibjuice === false) {
    return dgramListener(host, port, ipVersion, log, cb)
  }

  return libjuiceListener(host, port, log, cb)
}
