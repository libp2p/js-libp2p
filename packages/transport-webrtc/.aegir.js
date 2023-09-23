
/** @type {import('aegir').PartialOptions} */
export default {
  build: {
    bundlesizeMax: '117KB'
  },
  test: {
    before: async () => {
      const { createLibp2p } = await import('libp2p')
      const { circuitRelayServer } = await import('libp2p/circuit-relay')
      const { webSockets } = await import('@libp2p/websockets')
      const { noise } = await import('@chainsafe/libp2p-noise')
      const { yamux } = await import('@chainsafe/libp2p-yamux')

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
          })
        },
        connectionManager: {
          minConnections: 0,
          inboundConnectionThreshold: Infinity
        },
        connectionGater: {
          denyDialMultiaddr: (ma) => {
            if (ma.toOptions().family === 6) {
              return true
            }

            return false
          }
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
