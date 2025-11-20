import { isIPv4 } from '@chainsafe/is-ip'
import dgram from 'node:dgram'
import stun from 'stun'
import type { Logger } from '@libp2p/interface'
import type { AddressInfo } from 'node:net'

const { isStunMessage, decode, createMessage, encode, constants } = stun

export interface StunServer {
  close(): Promise<void>
  address(): AddressInfo
}

export interface Callback {
  (ufrag: string, remoteHost: string, remotePort: number): void
}

/**
 * Creates a STUN server listener for WebRTC Direct.
 * Uses the 'stun' package to handle STUN protocol messages.
 */
export async function stunListener (host: string, port: number, log: Logger, cb: Callback): Promise<StunServer> {
  const socket = dgram.createSocket(isIPv4(host) ? 'udp4' : 'udp6')
  
  socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    // Only process STUN messages
    if (!isStunMessage(msg)) {
      log.trace('received non-STUN packet from %s:%d', rinfo.address, rinfo.port)
      return
    }
    
    try {
      const request = decode(msg)
      
      // Extract ufrag from USERNAME attribute
      // WebRTC Direct uses ICE username format: "localUfrag:remoteUfrag" or just "ufrag"
      let ufrag: string | undefined
      
      if (request.attributes?.USERNAME != null) {
        const username = request.attributes.USERNAME
        // ICE username format is "ufrag:password" or just "ufrag"
        ufrag = username.split(':')[0]
      }
      
      if (ufrag == null || ufrag === '') {
        log.trace('STUN request missing USERNAME/ufrag from %s:%d', rinfo.address, rinfo.port)
        return
      }
      
      log.trace('incoming STUN packet from %s:%d ufrag=%s', rinfo.address, rinfo.port, ufrag)
      
      // Send STUN response with XOR-MAPPED-ADDRESS
      try {
        const response = createMessage(
          constants.STUN_BINDING_RESPONSE,
          request.transactionId
        )
        
        response.addAttribute(constants.STUN_ATTR_XOR_MAPPED_ADDRESS, {
          family: isIPv4(rinfo.address) ? 'IPv4' : 'IPv6',
          port: rinfo.port,
          address: rinfo.address
        })
        
        const responseBuffer = encode(response)
        socket.send(responseBuffer, rinfo.port, rinfo.address, (err) => {
          if (err != null) {
            log.error('failed to send STUN response to %s:%d - %e', rinfo.address, rinfo.port, err)
          }
        })
      } catch (err) {
        log.error('failed to create STUN response - %e', err)
      }
      
      // Callback to initiate WebRTC connection
      cb(ufrag, rinfo.address, rinfo.port)
    } catch (err) {
      log.error('failed to decode STUN message from %s:%d - %e', rinfo.address, rinfo.port, err)
    }
  })
  
  socket.on('error', (err) => {
    log.error('STUN listener error - %e', err)
  })
  
  // Bind the socket
  await new Promise<void>((resolve, reject) => {
    socket.once('error', reject)
    socket.bind(port, host, () => {
      socket.removeListener('error', reject)
      resolve()
    })
  })
  
  const actualAddress = socket.address() as AddressInfo
  log('STUN listener bound to %s:%d', actualAddress.address, actualAddress.port)
  
  return {
    close: async () => {
      await new Promise<void>((resolve) => {
        socket.close(() => {
          resolve()
        })
      })
    },
    address: () => {
      return socket.address() as AddressInfo
    }
  }
}
