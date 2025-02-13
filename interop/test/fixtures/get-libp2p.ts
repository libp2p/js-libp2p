/* eslint-disable complexity */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { type Identify, identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { type PingService, ping } from '@libp2p/ping'
import { tcp } from '@libp2p/tcp'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { webTransport } from '@libp2p/webtransport'
import { type Libp2pOptions, createLibp2p } from 'libp2p'
import type { Libp2p } from '@libp2p/interface'

const isDialer: boolean = process.env.is_dialer === 'true'

// Setup libp2p node
const TRANSPORT = process.env.transport
const SECURE_CHANNEL = process.env.security
const MUXER = process.env.muxer
const IP = process.env.ip ?? '0.0.0.0'

export async function getLibp2p (): Promise<Libp2p<{ ping: PingService }>> {
  const options: Libp2pOptions<{ ping: PingService, identify: Identify }> = {
    start: true,
    connectionGater: {
      denyDialMultiaddr: async () => false
    },
    connectionMonitor: {
      enabled: false
    },
    services: {
      ping: ping(),
      identify: identify()
    }
  }

  switch (TRANSPORT) {
    case 'tcp':
      options.transports = [tcp()]
      options.addresses = {
        listen: isDialer ? [] : [`/ip4/${IP}/tcp/0`]
      }
      break
    case 'webtransport':
      options.transports = [webTransport()]
      if (!isDialer) {
        throw new Error('WebTransport is not supported as a listener')
      }
      break
    case 'webrtc-direct':
      options.transports = [webRTCDirect()]
      options.addresses = {
        listen: isDialer ? [] : [`/ip4/${IP}/udp/0/webrtc-direct`]
      }
      break
    case 'webrtc':
      options.transports = [
        webRTC(),
        webSockets({ filter: filters.all }), // ws needed to connect to relay
        circuitRelayTransport()
      ]
      options.addresses = {
        listen: isDialer ? [] : ['/p2p-circuit', '/webrtc']
      }
      break
    case 'ws':
      options.transports = [webSockets()]
      options.addresses = {
        listen: isDialer ? [] : [`/ip4/${IP}/tcp/0/ws`]
      }
      break
    case 'wss':
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      options.transports = [webSockets()]
      options.addresses = {
        listen: isDialer ? [] : [`/ip4/${IP}/tcp/0/wss`]
      }
      break
    default:
      throw new Error(`Unknown transport: ${TRANSPORT ?? '???'}`)
  }

  let skipSecureChannel = false
  let skipMuxer = false
  switch (TRANSPORT) {
    case 'webtransport':
    case 'webrtc-direct':
      skipSecureChannel = true
      skipMuxer = true
      break
    case 'webrtc':
      skipSecureChannel = true
      skipMuxer = true
      // Setup yamux and noise to connect to the relay node
      options.streamMuxers = [yamux()]
      options.connectionEncrypters = [noise()]
      break
    default:
      // Do nothing
  }

  if (!skipSecureChannel) {
    switch (SECURE_CHANNEL) {
      case 'noise':
        options.connectionEncrypters = [noise()]
        break
      default:
        throw new Error(`Unknown secure channel: ${SECURE_CHANNEL ?? ''}`)
    }
  }

  if (!skipMuxer) {
    switch (MUXER) {
      case 'mplex':
        options.streamMuxers = [mplex()]
        break
      case 'yamux':
        options.streamMuxers = [yamux()]
        break
      default:
        throw new Error(`Unknown muxer: ${MUXER ?? '???'}`)
    }
  }

  return createLibp2p(options)
}
