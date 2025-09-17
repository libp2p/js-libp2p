import log from 'why-is-node-running'
import { execa } from 'execa'
import pDefer from 'p-defer'

setTimeout(() => {
  log()
}, 60_000).unref()

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '147kB'
  },
  test: {
    before: async () => {
      // use dynamic import because we only want to reference these files during the test run, e.g. after building
      const { noise } = await import('@libp2p/noise')
      const { yamux } = await import('@libp2p/yamux')
      const { WebSockets, WebRTCDirect } = await import('@multiformats/multiaddr-matcher')
      const { webSockets } = await import('@libp2p/websockets')
      const { mplex } = await import('@libp2p/mplex')
      const { createLibp2p } = await import('libp2p')
      const { plaintext } = await import('@libp2p/plaintext')
      const { circuitRelayServer, circuitRelayTransport } = await import('@libp2p/circuit-relay-v2')
      const { identify } = await import('@libp2p/identify')
      const { echo } = await import('@libp2p/echo')
      const { mockMuxer, getNetConfig } = await import('@libp2p/utils')
      const { ping } = await import('@libp2p/ping')
      const { prefixLogger } = await import('@libp2p/logger')
      const { webRTCDirect } = await import('@libp2p/webrtc')

      const libp2p = await createLibp2p({
        logger: prefixLogger('relay'),
        connectionManager: {
          inboundConnectionThreshold: Infinity
        },
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/0/ws',
            '/ip4/127.0.0.1/tcp/0/ws',
            '/ip4/0.0.0.0/udp/0/webrtc-direct',
            '/ip4/0.0.0.0/udp/0/webrtc-direct'
          ]
        },
        transports: [
          circuitRelayTransport(),
          webSockets(),
          webRTCDirect()
        ],
        streamMuxers: [
          yamux(),
          () => mockMuxer(),
          mplex()
        ],
        connectionEncrypters: [
          noise(),
          plaintext()
        ],
        services: {
          identify: identify(),
          relay: circuitRelayServer({
            reservations: {
              maxReservations: Infinity,
              applyDefaultLimit: false
            }
          }),
          echo: echo({
            maxInboundStreams: 5
          }),
          ping: ping()
        },
        connectionMonitor: {
          enabled: false
        }
      })

      const libp2pLimitedRelay = await createLibp2p({
        logger: prefixLogger('limited-relay'),
        connectionManager: {
          inboundConnectionThreshold: Infinity
        },
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/0/ws',
            '/ip4/127.0.0.1/tcp/0/ws',
            '/ip4/0.0.0.0/udp/0/webrtc-direct',
            '/ip4/0.0.0.0/udp/0/webrtc-direct'
          ]
        },
        transports: [
          circuitRelayTransport(),
          webSockets(),
          webRTCDirect()
        ],
        streamMuxers: [
          yamux(),
          () => mockMuxer(),
          mplex()
        ],
        connectionEncrypters: [
          noise(),
          plaintext()
        ],
        services: {
          identify: identify(),
          relay: circuitRelayServer({
            reservations: {
              maxReservations: Infinity
            }
          }),
          echo: echo({
            maxInboundStreams: 5
          }),
          ping: ping()
        },
        connectionMonitor: {
          enabled: false
        }
      })

      const goLibp2pRelay = await createGoLibp2pRelay()
      const wsAddresses = libp2p.getMultiaddrs().filter(ma => WebSockets.exactMatch(ma))
      const webRTCDirectPorts = new Set()
      const webRTCDirectAddresses = libp2p.getMultiaddrs()
        .filter(ma => {
          const options = getNetConfig(ma)
          // firefox can't seem to dial loopback :shrug:
          if (options.host !== '127.0.0.1') {
            return false
          }

          // only return one addr per port
          if (webRTCDirectPorts.has(options.port)) {
            return false
          }
          webRTCDirectPorts.add(options.port)

          return WebRTCDirect.exactMatch(ma)
        })
      const limitedWsAddresses = libp2pLimitedRelay.getMultiaddrs().filter(ma => WebSockets.exactMatch(ma))

      return {
        libp2p,
        goLibp2pRelay,
        libp2pLimitedRelay,
        env: {
          RELAY_MULTIADDR: wsAddresses[0],
          RELAY_WS_MULTIADDR_0: wsAddresses[0],
          RELAY_WS_MULTIADDR_1: wsAddresses[1],
          RELAY_WEBRTC_DIRECT_MULTIADDR_0: webRTCDirectAddresses[0],
          RELAY_WEBRTC_DIRECT_MULTIADDR_1: webRTCDirectAddresses[1],
          LIMITED_RELAY_MULTIADDR: limitedWsAddresses[0],
          GO_RELAY_PEER: goLibp2pRelay.peerId,
          GO_RELAY_MULTIADDRS: goLibp2pRelay.multiaddrs,
          GO_RELAY_APIADDR: goLibp2pRelay.apiAddr
        }
      }
    },
    after: async (_, before) => {
      await before.libp2p?.stop()
      await before.goLibp2pRelay?.proc.kill()
      await before.libp2pLimitedRelay?.stop()
    }
  }
}

async function createGoLibp2pRelay () {
  const { multiaddr } = await import('@multiformats/multiaddr')
  const { path: p2pd } = await import('go-libp2p')
  const { createClient } = await import('@libp2p/daemon-client')
  const { defaultLogger } = await import('@libp2p/logger')

  const log = defaultLogger().forComponent('go-libp2p')
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/127.0.0.1/tcp/${controlPort}`)
  const deferred = pDefer()
  const proc = execa(p2pd(), [
    `-listen=${apiAddr.toString()}`,
    // listen on TCP, WebSockets and WebTransport
    '-hostAddrs=/ip4/127.0.0.1/tcp/0,/ip4/127.0.0.1/tcp/0/ws,/ip4/127.0.0.1/udp/0/quic-v1/webtransport',
    '-noise=true',
    '-dhtServer',
    '-relay',
    '-muxer=mplex'
  ], {
    env: {
      GOLOG_LOG_LEVEL: 'debug'
    }
  })
  proc.catch(() => {
    // go-libp2p daemon throws when killed
  })

  proc.stdout?.on('data', (buf) => {
    const str = buf.toString()

    // daemon has started
    if (str.includes('Control socket:')) {
      deferred.resolve()
    }
  })
  proc.stderr?.on('data', (buf) => {
    const str = buf.toString()

    log(str)
  })
  await deferred.promise

  const daemonClient = createClient(apiAddr)
  const id = await daemonClient.identify()

  return {
    apiAddr,
    peerId: id.peerId.toString(),
    multiaddrs: id.addrs.map(ma => ma.toString()).join(','),
    proc
  }
}
