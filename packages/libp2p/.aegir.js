import { pipe } from 'it-pipe'

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
      const { createLibp2p } = await import('./dist/src/index.js')
      const { plaintext } = await import('./dist/src/insecure/index.js')
      const { circuitRelayServer, circuitRelayTransport } = await import('./dist/src/circuit-relay/index.js')
      const { identifyService } = await import('./dist/src/identify/index.js')
      const { pingService } = await import('./dist/src/ping/index.js')
      const { fetchService } = await import('./dist/src/fetch/index.js')

      const peerId = await createEd25519PeerId()
      const libp2p = await createLibp2p({
        connectionManager: {
          inboundConnectionThreshold: 1000,
          maxIncomingPendingConnections: 1000,
          maxConnections: 1000,
          minConnections: 0
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
          identify: identifyService(),
          ping: pingService(),
          fetch: fetchService(),
          relay: circuitRelayServer({
            reservations: {
              maxReservations: 100000
            }
          })
        }
      })
      // Add the echo protocol
      await libp2p.handle('/echo/1.0.0', ({ stream }) => {
        pipe(stream, stream)
          .catch() // sometimes connections are closed before multistream-select finishes which causes an error
      })

      return {
        libp2p,
        env: {
          RELAY_MULTIADDR: libp2p.getMultiaddrs().filter(ma => WebSockets.matches(ma)).pop()
        }
      }
    },
    after: async (_, before) => {
      await before.libp2p.stop()
    }
  }
}
