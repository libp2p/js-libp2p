import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'

export default {
  build: {
    config: {
      platform: 'node'
    },
    bundlesizeMax: '117KB'
  },
  test: {
    before: async () => {
      // start a relay node for use in the tests
      const relay = await createLibp2p({
        addresses: {
          listen: [
            '/ip4/127.0.0.1/tcp/0/ws'
          ]
        },
        transports: [
          webSockets()
        ],
        connectionEncryption: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ],
        services: {
          relay: circuitRelayServer({
            reservations: {
              maxReservations: Infinity
            }
          }),
          identify: identifyService()
        },
        connectionManager: {
          minConnections: 0
        }
      })

      const multiaddrs = relay.getMultiaddrs().map(ma => ma.toString())

      return {
        relay,
        env: {
          RELAY_MULTIADDR: multiaddrs[0]
        }
      }
    },
    after: async (_, before) => {
      await before.relay.stop()
    }
  }
}
