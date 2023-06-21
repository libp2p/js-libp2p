/* eslint-disable no-console */
/* eslint-env mocha */

import { } from 'aegir/chai'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { webTransport } from '@libp2p/webtransport'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { createLibp2p, type Libp2p, type Libp2pOptions } from 'libp2p'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { pingService, type PingService } from 'libp2p/ping'
import type { DefaultIdentifyService } from 'libp2p/identify/identify'

async function redisProxy (commands: any[]): Promise<any> {
  const res = await fetch(`http://localhost:${process.env.proxyPort ?? ''}/`, { body: JSON.stringify(commands), method: 'POST' })
  if (!res.ok) {
    throw new Error('Redis command failed')
  }
  return res.json()
}

let node: Libp2p<{ ping: PingService, identify: DefaultIdentifyService }>
const isDialer: boolean = process.env.is_dialer === 'true'
const timeoutSecs: string = process.env.test_timeout_secs ?? '180'

describe('ping test', () => {
  // eslint-disable-next-line complexity
  beforeEach(async () => {
    // Setup libp2p node
    const TRANSPORT = process.env.transport
    const SECURE_CHANNEL = process.env.security
    const MUXER = process.env.muxer
    const IP = process.env.ip ?? '0.0.0.0'

    const options: Libp2pOptions<{ ping: PingService, identify: DefaultIdentifyService }> = {
      start: true,
      connectionGater: {
        denyDialMultiaddr: async () => false
      },
      services: {
        ping: pingService(),
        identify: identifyService()
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
        options.transports = [webRTC(),
          webSockets({ filter: filters.all }), // ws needed to connect to relay
          circuitRelayTransport({
            discoverRelays: 1
          }) // needed to use the relay
        ]
        options.addresses = {
          listen: isDialer ? [] : ['/webrtc']
        }
        options.connectionGater = {
          denyDialMultiaddr: () => {
            // by default we refuse to dial local addresses from the browser since they
            // are usually sent by remote peers broadcasting undialable multiaddrs but
            // here we are explicitly connecting to a local node so do not deny dialing
            // any discovered address
            return false
          }
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
        options.connectionEncryption = [noise()]
        break
      default:
        // Do nothing
    }

    if (!skipSecureChannel) {
      switch (SECURE_CHANNEL) {
        case 'noise':
          options.connectionEncryption = [noise()]
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
        case 'quic':
          break
        default:
          throw new Error(`Unknown muxer: ${MUXER ?? '???'}`)
      }
    }

    node = await createLibp2p(options)
  })

  afterEach(async () => {
    // Shutdown libp2p node
    try {
      // We don't care if this fails
      await node.stop()
    } catch { }
  });

  // eslint-disable-next-line complexity
  (isDialer ? it.skip : it)('should listen for ping', async () => {
    try {
      const sortByNonLocalIp = (a: Multiaddr, b: Multiaddr): number => {
        if (a.toString().includes('127.0.0.1')) {
          return 1
        }
        return -1
      }
      let multiaddrs = node.getMultiaddrs().sort(sortByNonLocalIp).map(ma => ma.toString())

      const transport = process.env.transport
      if (transport === 'webrtc') {
        const relayAddr = process.env.relayAddr
        const hasWebrtcMultiaddr = new Promise<string[]>((resolve) => {
          const abortController = new AbortController()
          node.addEventListener('self:peer:update', (event) => {
            const webrtcMas = node.getMultiaddrs().filter(ma => ma.toString().includes('/webrtc'))
            if (webrtcMas.length > 0) {
              resolve(webrtcMas.sort(sortByNonLocalIp).map(ma => ma.toString()))
            }
            abortController.abort()
          }, { signal: abortController.signal })
        })

        if (relayAddr == null || relayAddr === '') {
          throw new Error('No relayAddr')
        }
        // const conn = await node.dial(multiaddr(relayAddr))
        await node.dial(multiaddr(relayAddr))
        multiaddrs = await hasWebrtcMultiaddr
      }

      // Send the listener addr over the proxy server so this works on both the Browser and Node
      await redisProxy(['RPUSH', 'listenerAddr', multiaddrs[0]])
      // Wait
      await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(timeoutSecs, 10)))
    } catch (err) {
      // Show all errors in an aggregated error
      if (err instanceof AggregateError) {
        console.error('unexpected exception in ping test Errors:', err.errors)
      } else {
        console.error('unexpected exception in ping test:', err)
      }
      throw err
    }
  });

  // eslint-disable-next-line complexity
  (isDialer ? it : it.skip)('should dial and ping', async () => {
    try {
      let otherMa: string = (await redisProxy(['BLPOP', 'listenerAddr', timeoutSecs]).catch(err => { throw new Error(`Failed to wait for listener: ${err}`) }))[1]
      // Hack until these are merged:
      // - https://github.com/multiformats/js-multiaddr-to-uri/pull/120
      otherMa = otherMa.replace('/tls/ws', '/wss')

      console.error(`node ${node.peerId.toString()} pings: ${otherMa}`)
      const handshakeStartInstant = Date.now()
      await node.dial(multiaddr(otherMa))
      const pingRTT = await node.services.ping.ping(multiaddr(otherMa))
      const handshakePlusOneRTT = Date.now() - handshakeStartInstant
      console.log(JSON.stringify({
        handshakePlusOneRTTMillis: handshakePlusOneRTT,
        pingRTTMilllis: pingRTT
      }))
    } catch (err) {
      // Show all errors in an aggregated error
      if (err instanceof AggregateError) {
        console.error('unexpected exception in ping test Errors:', err.errors)
      } else {
        console.error('unexpected exception in ping test:', err)
      }
      throw err
    }
  })
})
