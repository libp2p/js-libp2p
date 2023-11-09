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
      const { plaintext } = await import('@libp2p/plaintext')
      const { circuitRelayServer, circuitRelayTransport } = await import('@libp2p/circuit-relay-v2')
      const { identify } = await import('@libp2p/identify')
      const { fetchService } = await import('./dist/src/fetch/index.js')

      const peerId = await createEd25519PeerId()
      const libp2p = await createLibp2p({
        connectionManager: {
          inboundConnectionThreshold: Infinity,
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
          identify: identify(),
          fetch: fetchService(),
          relay: circuitRelayServer({
            reservations: {
              maxReservations: Infinity
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
