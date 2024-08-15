import { execa } from 'execa'
import pDefer from 'p-defer'

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '147kB'
  },
  test: {
    before: async () => {
      // use dynamic import because we only want to reference these files during the test run, e.g. after building
      const { webSockets } = await import('@libp2p/websockets')
      const { mplex } = await import('@libp2p/mplex')
      const { noise } = await import('@chainsafe/libp2p-noise')
      const { createEd25519PeerId } = await import('@libp2p/peer-id-factory')
      const { yamux } = await import('@chainsafe/libp2p-yamux')
      const { WebSockets } = await import('@multiformats/mafmt')
      const { createLibp2p } = await import('libp2p')
      const { plaintext } = await import('@libp2p/plaintext')
      const { circuitRelayServer, circuitRelayTransport } = await import('@libp2p/circuit-relay-v2')
      const { identify } = await import('@libp2p/identify')
      const { echo } = await import('@libp2p/echo')

      const peerId = await createEd25519PeerId()
      const libp2p = await createLibp2p({
        connectionManager: {
          inboundConnectionThreshold: Infinity
        },
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/0/ws'
          ]
        },
        peerId,
        transports: [
          circuitRelayTransport(),
          webSockets()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionEncryption: [
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
          echo: echo()
        }
      })

      const goLibp2pRelay = await createGoLibp2pRelay()

      return {
        libp2p,
        goLibp2pRelay,
        env: {
          RELAY_MULTIADDR: libp2p.getMultiaddrs().filter(ma => WebSockets.matches(ma)).pop(),
          GO_RELAY_PEER: goLibp2pRelay.peerId,
          GO_RELAY_MULTIADDRS: goLibp2pRelay.multiaddrs,
          GO_RELAY_APIADDR: goLibp2pRelay.apiAddr
        }
      }
    },
    after: async (_, before) => {
      await before.libp2p.stop()
      await before.goLibp2pRelay.proc.kill()
    }
  }
}

async function createGoLibp2pRelay () {
  const { multiaddr } = await import('@multiformats/multiaddr')
  const { path: p2pd } = await import('go-libp2p')
  const { createClient } = await import('@libp2p/daemon-client')

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
