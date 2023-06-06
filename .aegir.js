import { webSockets } from '@libp2p/websockets'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { pipe } from 'it-pipe'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { yamux } from '@chainsafe/libp2p-yamux'
import { WebSockets } from '@multiformats/mafmt'

/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '147kB'
  },
  test: {
    before: async () => {
      // use dynamic import because we only want to reference these files during the test run, e.g. after building
      const { createLibp2p } = await import('./dist/src/index.js')
      const { plaintext } = await import('./dist/src/insecure/index.js')
      const { circuitRelayServer, circuitRelayTransport } = await import('./dist/src/circuit-relay/index.js')
      const { identifyService } = await import('./dist/src/identify/index.js')
      const { pingService } = await import('./dist/src/ping/index.js')
      const { fetchService } = await import('./dist/src/fetch/index.js')

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
          identify: identifyService(),
          ping: pingService(),
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
